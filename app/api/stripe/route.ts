import {auth, currentUser} from "@clerk/nextjs"
import { NextResponse } from "next/server"

import prismadb from "@/lib/prismadb"
import { stripe } from "@/lib/stripe"
import { absoluteUrl } from "@/lib/utils"

const settingsUrl = absoluteUrl("/settings")

export async function GET(){
    try {
        const {userId} = auth();
        const user = await currentUser();

        if(!user || !userId){
            return new NextResponse("Unauthorized user access", {status: 401});
        }

        const userSubscription = await prismadb.userSubscription.findUnique({
            where: {
                userId
            }
        })

        //already a subscription then no checkout
        if(userSubscription && userSubscription.stripeCustomerId){
            const stripeSession = await stripe.billingPortal.sessions.create({
                customer: userSubscription.stripeCustomerId,
                return_url: settingsUrl
            })
            return new NextResponse(JSON.stringify({url: stripeSession.url}))
        }

        const stripeSession = await stripe.checkout.sessions.create({
            success_url: settingsUrl,
            cancel_url: settingsUrl,
            payment_method_types: ["card"],
            mode: "subscription",
            billing_address_collection: "auto",
            customer_email: user.emailAddresses[0].emailAddress,
            line_items:[
                {
                    price_data: {
                        currency: "INR",
                        product_data: {
                          name: "Gear-5 Pro",
                          description: "Unlimited AI Generations"
                        },
                        unit_amount: 20000,
                        recurring: {
                          interval: "month"
                        }
                      },
                      quantity: 1,
                }
            ],
            metadata: {
                userId,
              }, 
        });

        return new NextResponse(JSON.stringify({ url: stripeSession.url }))
        
    } catch (error) {
        console.log("[Stripe Error]", error);
        return new NextResponse("Internal Server Error", {status: 500});
    }
}




