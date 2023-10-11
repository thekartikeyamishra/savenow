"use server"
import { User } from "@/types";
import Product from "../models/productmodel";
import { connectToDB } from "../mongoose";
import { generateEmailBody, sendEmail } from "../nodemailer";
import {scrapeAmazonProduct} from "../scraper";
import { getAveragePrice, getHighestPrice, getLowestPrice } from "../utils";
import { revalidatePath } from "next/cache";

export async function scrapeAndStoreProduct(productUrl :string){
    if(!productUrl) return;

    try {
        connectToDB();

        //Scrapping data

        const scrapedProduct = await scrapeAmazonProduct(productUrl);
        if(!scrapedProduct) return;

        // Storing and finding data in mongoose database 
        let product = scrapedProduct;
        const existingProduct = await Product.findOne({url: scrapedProduct.url});

        if(existingProduct){
            const updatePriceHistory : any =[
                ...existingProduct.priceHistory,
                {price: scrapedProduct.currentPrice}
            ]

            //modifing the product object.

            product ={
                ...scrapedProduct,
                priceHistory: updatePriceHistory,
                lowestPrice: getLowestPrice(updatePriceHistory),
                highestPrice: getHighestPrice(updatePriceHistory),
                averagePrice: getAveragePrice(updatePriceHistory),
            }
        }
        const newProduct = await Product.findOneAndUpdate(
            {url: scrapedProduct.url}, //finding url first
            product,
            {upsert: true, new: true}
        );

        revalidatePath('/products/${newProduct._id}');
        
    } catch (error: any) {
        throw new Error ('Failed to create/update product: ${error.message}')
        
    }
}

export async function getProductById(productId: string){
    try {
        connectToDB();
        const product = await Product.findOne({_id: productId});
        if(!product) return null;
        return product;
        
    } catch (error) {
        console.log(error);
        
    }
}

export async function getAllProducts(){
    try {
        connectToDB();
        const products = await Product.find();
        return products;
    } catch (error) {
         console.log(error);
        
    }
}

export async function getSimilarProducts(productId: string){
    try {
        connectToDB();
        const currentProduct = await Product.findById(productId);
        if(!currentProduct) return null;

        const similarProducts = await Product.find({
            _id: {$ne: productId},
        }).limit(3);
        return similarProducts;
    } catch (error) {
         console.log(error);
        
    }
}

export async function addUserEmailToProduct(productId: string, userEmail: string) {
    try {
      const product = await Product.findById(productId);
  
      if(!product) return;
  
      const userExists = product.users.some((user: User) => user.email === userEmail);
  
      if(!userExists) {
        product.users.push({ email: userEmail });
  
        await product.save();
  
        const emailContent = await generateEmailBody(product, "WELCOME");
  
        await sendEmail(emailContent, [userEmail]);
      }
    } catch (error) {
      console.log(error);
    }
  }