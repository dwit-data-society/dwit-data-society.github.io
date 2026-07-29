"use client";
import { motion } from "motion/react";
import { s } from "motion/react-client";
import { useEffect, useState,useRef } from "react";


const InfiniteCarousel = () => {
    const slides = [
        {str:"DATA DRIVEN "},
        {str:"ANALYTICS ",},
        {str:"VISUALIZATION ",},
        {str:"INSIGHTS "},

    ]


        const group = Array(6).fill(slides).flat();
        const dupslides = [...group, ...group, ...group, ...group];




  return (
    <>
        <div className="flex w-full h-[20svh] items-center  overflow-hidden ">
            <div className="flex w-max gap-10 animate-infinite-carousel" >
            {[...slides,...slides,...slides].map((slide,index)=>(
               <div key={index} className="flex items-center justify-center gap-10 whitespace-nowrap">
                    <div className="font-bold sm:text-4xl text-2xl  ">{slide.str}</div>
                    <div className="opacity-70 text-xl lg:text-3xl ">★</div>

                </div>
            ))}
            </div>
        </div>
        
    
    </>
  )
}

export default InfiniteCarousel