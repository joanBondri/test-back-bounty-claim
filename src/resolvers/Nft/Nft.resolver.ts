import { Arg, Ctx, Mutation, Resolver } from "type-graphql";
import { Context } from "@/schema";
import { Nft } from "@/resolvers/Nft/Nft.type";
import { prisma } from "@/prisma";

@Resolver(() => Nft)
export class NftResolver {

    @Mutation(() => Nft, {nullable : true})
    async sendNft(@Ctx() { user }: Context,@Arg("receiverId", () => String) receiverId: string,
        @Arg("nftId", () => String) nftId : string) {
            if (receiverId === user?.id)
                throw new Error("sender and receiver are the same")
            await prisma.user.findUniqueOrThrow(
            {
                where : {id : user?.id},
            })
            await prisma.user.findUniqueOrThrow(
            {
                where : {id : receiverId},
            })

        const nftToken = await prisma.nft.findUniqueOrThrow(
            {
                where : {
                    id : nftId
                }
            })

        if (nftToken.fkOwnerId !== user?.id)
            throw new Error("wrong owner")
        const updatedNft = prisma.nft.update({
                where : {
                    id : nftId,
                },
                data : {
                    fkOwnerId : receiverId,
                }
            })
        return updatedNft
    }
}
