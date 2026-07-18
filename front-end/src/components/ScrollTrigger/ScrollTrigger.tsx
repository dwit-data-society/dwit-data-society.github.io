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
    const pElementRef = useRef<HTMLParagraphElement>(null);
    const introCopyRef = useRef(null);
    const websiteContentRef = useRef(null);

    const introHeaders = [
        "<span>time to </span> be brave",
        "<span>time to </span> be brdwdwave",
        "<span>time to </span> be bdwdwdrave",
        "<span>time to </span> be brdwdwave",
       
    ];
    const introp = [
        "<span>time to </span> be brave",
        "<span>time to </span> be brdwdwave",
        "<span>time to </span> be bdwdwdrave",
        "<span>time to </span> be brdwdwave",
       
    ];

    useGSAP(()=>{
        let currentCycle = -1;
        let imageRevealed = false;

        const updateHeaderText = () => {
            if(h1ElementRef.current){
                h1ElementRef.current.innerHTML = introHeaders[Math.min(currentCycle,introHeaders.length - 1 )];
            }
        }

        const updateParagraphText = () => {
            if(pElementRef.current){
                pElementRef.current.innerHTML = introp[Math.min(currentCycle,introp.length - 1 )];
            }
        }
        
        const pinnedHeight = window.innerHeight *5;

        ScrollTrigger.create({
                trigger:stickyRef.current,
                start:"top top",
                end:`+=${pinnedHeight}`,
                pin:true,
                pinSpacing:true,
                onUpdate:(self)=>{
                    const progress = self.progress;
                    const rotationProgress = Math.min((progress *4)/4,1);
                    const totalRotation = rotationProgress*1440-90;
                    const rotationInCycle= ((totalRotation +90) %360)-90;
                    gsap.set(handContainerRef.current,{rotateZ:rotationInCycle});

                    const newCycle = Math.floor((totalRotation+90)/360);
                    if( newCycle != currentCycle && newCycle >=0 && newCycle<=introHeaders.length){
                        currentCycle=newCycle;
                        updateHeaderText();
                        updateParagraphText();

                    }
                }
                
            })
        },{scope:container});



  return (
    <>
    <div ref={container} className="w-full overflow-hidden">
        <section className="sticky w-screen h-screen" ref={stickyRef}>
            <div ref = {handContainerRef} className=" absolute lg:top-[50%] top-[60%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-190 h-190 lg:w-220 lg:h-220 flex justify-center items-start origin-center [transform-style:preserve-3d] [will-change:transform] z-2 ">
                <div ref={handRef} className="  bg-white absolute w-[5.5%] h-[52.75%] rounded-full [will-change:transform] overflow-hidden">
                    <img ref = {handImageRef} className='w-full h-full objext-cover opacity-0' src="next.svg" alt="" />
                </div>
            </div>
            <div  ref = {introRef} className="absolute left-1/2 -translate-x-1/2 lg:-translate-x-0 lg:top-[calc(50%-20px)] lg:-left-6 lg:w-[50.5%] w-[90%]  top-[20%] ">
                <h1 ref = {h1ElementRef} className=" lg:top-[120%] top-[50%] font-bold text-center text-3xl lg:text-4xl "><span className="">time to </span> be brave</h1>
                <div ref= {introCopyRef}>
                    <p ref={pElementRef} className="text-base text-center lg:text-3xl relative  mt-[0.75em]  ">Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ratione dolores quasi corporis architecto? Aut unde, alias natus, sit nisi at velit odit ipsa earum incidunt nobis minima recusandae explicabo culpa.
                        
                    </p>
                </div>
            </div>
            <div ref={websiteContentRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center opacity-0">
                <h1 className="font-medium text-[10vw]">DeerWalk Data Society</h1>
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