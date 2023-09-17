import { Arg, Ctx, Mutation, Resolver } from "type-graphql";
import { faker } from "@faker-js/faker";
import { Context } from "@/schema";
import { Bounty } from "@/resolvers/Bounty/Bounty.type";
import { Nft } from "@/resolvers/Nft/Nft.type";
import { prisma } from "@/prisma";

function getRandNumberNft(max : number | null, exclusions : number[]) {
    if (max != null)
        return genRandNumberWithMax(max,exclusions)

    let randomNum : number
    const max32BitInt = 2 ** 31 - 1;
    do
    {
        randomNum = Math.floor(Math.random() * max32BitInt) + 1
    }
    while (exclusions.includes(randomNum))
    
    return randomNum
  }
function genRandNumberWithMax(max : number, exclusions : number[]) : number
{
    exclusions = exclusions.sort((a, b) => a - b)
    let incrementalInteger : number = Math.floor(Math.random() * (max - exclusions.length)) + 1;
    exclusions.find((value) => {
        if (value > incrementalInteger)
            return true
        incrementalInteger++
        return false
    })
    return incrementalInteger
}

@Resolver(() => Bounty)
export class BountyResolver {
    /**
     * Attempt to claim a bounty with a claim code.
     * There are multiple restrictions on claiming a bounty:
     * - The bounty must be active
     * - The bounty must not have been claimed by this user
     * - The claim code must be the correct claim code for the bounty
     * - The NFT claimed cannot be owned by a user
     * An error will be thrown if any of these restrictions are not met.
     *
     * If the bounty is successfully claimed, the user will become owner of an NFT.
     * If the bounty's random property is true, the NFT will be random from the bounty's NFTs.
     *
     * @param context - The context of the request
     * @param claimCode - The claim code used to claim the bounty
     *
     * @returns The NFT claimed
     */

    @Mutation(() => Nft, {nullable : true})
    async bountyClaim(@Ctx() { user }: Context, @Arg("claimCode", () => String) claim: string) {

        const userToken = await prisma.user.findUniqueOrThrow(
            {
                where : {id : user?.id}
            })
        const bountyToken = await prisma.bounty.findUniqueOrThrow(
            {
                where : {claimCode : claim}
            })
        const trackToken = await prisma.track.findUniqueOrThrow(
            {
                where : {id : bountyToken.fkTrackId},
                include : {nfts : true}
            })

        if (!bountyToken.isActive)
            throw new Error(`Bounty with claim code "${claim}" is not active`)
        const listClaimed = trackToken.nfts.filter((value) => value.fkOwnerId !== null)
        if (bountyToken.maxClaim && listClaimed.length >= bountyToken.maxClaim)
            throw new Error(`This NFT is already owned by another user`)
        if (bountyToken.claimedIds.find(value => value === userToken.id) !== undefined)
            throw new Error(`You already claimed this code`)

        const numberNewNft = bountyToken.isRandom ?
            getRandNumberNft(bountyToken.maxClaim, listClaimed.map((e) => e.number)) :
            listClaimed.length + 1
        
        const newNft = await prisma.nft.create({
            data: {
                id: faker.string.uuid(),
                number: numberNewNft,
                fkTrackId: trackToken.id,
                fkOwnerId: userToken.id,
            },
        })
        
        await prisma.bounty.update({
            where : {
                id : bountyToken.id,
            },
            data : {
                claimedIds : {
                    push : userToken.id,
                }
            }
        })
        return newNft
    }
}
