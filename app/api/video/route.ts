import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import Replicate from "replicate"
import { incrementApiLimit, checkApiLimit } from "@/lib/api-limit";
import { checkSubscription } from "@/lib/subscription";


const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN!
})

export async function POST (req: Request, res: Response){
    try{
        const {userId} = auth();
        const body = await req.json();
        const {prompt} = body

        if(!userId) {
            return new NextResponse("Unauthorized", {status: 401})
        }

        if(!prompt) {
            return new NextResponse("prompt is required", {status: 400})
        }

        const freeTrial = await checkApiLimit();
        const isPro = await checkSubscription();
        if(!freeTrial &&  !isPro){
            return new NextResponse("Free trial has expired", {status: 403})
        }

        const response = await replicate.run(
            "anotherjesse/zeroscope-v2-xl:71996d331e8ede8ef7bd76eba9fae076d31792e4ddf4ad057779b443d6aea62f",
            {
              input: {
                prompt,
              }
            }
          );

          if(!isPro){
            await incrementApiLimit();
        }
          return NextResponse.json(response);
    }catch(err){
        console.log("[Video Error]", err);
        return new NextResponse("Internal Server Error", {status: 500});
    }
}