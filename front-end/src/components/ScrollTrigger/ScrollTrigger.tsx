"use client";

import {useEffect,useRef} from "react";
import Lenis from "lenis";
import gsap from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useGSAP} from "@gsap/react";

gsap.registerPlugin(ScrollTrigger); 

const ScrollTriggerSection = () => {
    const container = useRef(null);
    const stickyRef = useRef(null);
    const handContainerRef = useRef(null);
    const handRef = useRef(null);
    const handImageRef = useRef(null);
    const introRef = useRef(null);
    const h1ElementRef = useRef<HTMLHeadingElement>(null);
    const introCopyRef = useRef(null);
    const websiteContentRef = useRef(null);

    const introHeaders = [
        "<span>time to </span> be brave",
        "<span>time to </span> be brdwdwave",
        "<span>time to </span> be bdwdwdrave",
        "<span>time to </span> be brdwdwave",
        "<span>time to </span> be brdwdwdave",
    ];

    useGSAP(()=>{
        let currentCycle = -1;
        let imageRevealed = false;

        const updateHeaderText = () => {
            if(h1ElementRef.current){
                h1ElementRef.current.innerHTML = introHeaders[Math.min(currentCycle,introHeaders.length - 1 )];
            }
        }
            const pinnedHeight = window.innerHeight *8;

            ScrollTrigger.create({
                trigger:stickyRef.current,
                start:"top top",
                end:`+=${pinnedHeight}`,
                pin:true,
                pinSpacing:true,
                onUpdate:(self)=>{
                    const progress = self.progress;
                    const rotationProgress = Math.min((progress *8)/5,1);
                    const totalRotation = rotationProgress*1800-90;
                    const rotationInCycle= ((totalRotation +90) %360)-90;
                    gsap.set(handContainerRef.current,{rotateZ:rotationInCycle});

                    const newCycle = Math.floor((totalRotation+90)/360);
                    if( newCycle != currentCycle && newCycle >=0 && newCycle<=introHeaders.length){
                        currentCycle=newCycle;
                        updateHeaderText();
                    }
                }
                
            })
        },{scope:container});



  return (
    <>
    <div ref={container} className="w-full overflow-hidden">
        <section className="sticky w-screen h-screen" ref={stickyRef}>
            <div ref = {handContainerRef} className=" absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2  w-200 h-200 flex justify-center items-start origin-center [transform-style:preserve-3d] [will-change:transform] z-2 ">
                <div ref={handRef} className="  bg-white absolute w-[5.5%] h-[52.75%] rounded-full [will-change:transform] overflow-hidden">
                    <img ref = {handImageRef} className='w-full h-full objext-cover opacity-0' src="next.svg" alt="" />
                </div>
            </div>
            <div  ref = {introRef} className="absolute top-[calc(50%-20px)] lg:left-1/4 w-[22.5%] left-4 ">
                <h1 ref = {h1ElementRef} className="font-bold text-4xl"><span>time to </span> be brave</h1>
                <div ref= {introCopyRef}>
                    <p className="text-base text-justify relative mt-[0.75em] translate-x-[20px] opacity-0 ">Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ratione dolores quasi corporis architecto? Aut unde, alias natus, sit nisi at velit odit ipsa earum incidunt nobis minima recusandae explicabo culpa.

                    </p>
                    <p className="text-base text-justify relative mt-[0.75em] translate-x-[20px] opacity-0">Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ratione dolores quasi corporis architecto? Aut unde, alias natus, sit nisi at velit odit ipsa earum incidunt nobis minima recusandae explicabo culpa.
                        
                    </p>
                </div>
            </div>
            <div ref={websiteContentRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center opacity-0">
                <h1 className="font-medium text-[10vw]">Codegrid</h1>
            </div>
        </section>
        <section className="flex justify-center items-center w-screen h-screen bg-white">
            <p className="text-base text-justify text-black">efefe</p>
        </section>
    </div>

    </>
  )
}

export default ScrollTriggerSection