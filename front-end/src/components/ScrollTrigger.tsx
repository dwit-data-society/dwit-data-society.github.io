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
        "Our",
        "<span>time to </span> be brdwdwave",
        "<span>time to </span> be bdwdwdrave",
        "Our Mission",
       
    ];
    const introp = [
        "<span>time to </span> be brave",
        "<span>time to </span> be brdwdwave",
        "<span>time to </span> be bdwdwdrave",
        "The Data Society started with a simple idea, that numbers are more interesting when someone takes the time to actually look at them. What began as curiosity about how well our own predictions held up against real-world results has grown into a home for every kind of question we're excited to dig into, from analytics and surveys to campus life and beyond. We believe good data work isn't just about the analysis itself, but about telling that story clearly enough that anyone can follow along, not just the people who wrote the code. Every project here starts the same way, a question worth asking, a dataset worth exploring, and the patience to see what it actually says.",
       
    ];

    useGSAP(()=>{
        const updateHeaderText = () => {
            if(h1ElementRef.current){
                gsap.to(h1ElementRef.current,{
                    opacity:0,
                    x:5,
                    duration:0.3,
                    onComplete:() => {
                         h1ElementRef.current!.innerHTML =introHeaders[Math.min(currentCycle, introHeaders.length - 1)];
                         gsap.to(h1ElementRef.current,{
                             opacity:1,
                             x:0,
                             duration:0.3,
     
                         })
                    }}
                )
            }
        }
               
          
           
      

        const updateParagraphText = () => {
           if(pElementRef.current){
                gsap.to(pElementRef.current,{
                    opacity:0,
                    x:5,
                    duration:0.4,
                    onComplete:() => {
                         pElementRef.current!.innerHTML =introp[Math.min(currentCycle, introp.length - 1)];
                         gsap.to(pElementRef.current,{
                             opacity:1,
                             x:0,
                             duration:0.4,
     
                         })
                    }}
                )
            }
        }
        let currentCycle = 0;
        updateHeaderText();
        updateParagraphText();
        let imageRevealed = false;

        
        
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
                    const totalRotation = rotationProgress*1440-180;
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
            <div ref = {handContainerRef} className=" absolute -rotate-180 lg:top-[50%] top-[10%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-30 h-30  lg:w-220 lg:h-220  flex justify-center items-start origin-center [transform-style:preserve-3d] [will-change:transform] z-2 ">
                <div ref={handRef} className="  bg-white absolute w-[5.5%] h-[52.75%] rounded-full [will-change:transform] overflow-hidden">
                    <img ref = {handImageRef} className='w-full h-full objext-cover opacity-0' src="next.svg" alt="" />
                </div>
            </div>
            <div  ref = {introRef} className="absolute left-1/2 -translate-x-1/2 lg:-translate-x-0 lg:top-[calc(50%-150px)] lg:left-20 lg:w-[40.5%] w-[80%] h-[90%]  top-[20%] ">
                <h1 ref = {h1ElementRef} className=" lg:top-[120%] top-[50%] font-bold text-center text-4xl sm:text-6xl lg:text-6xl "><span className="">time to </span> be brave</h1>
                <div ref= {introCopyRef}>
                    <p ref={pElementRef} className="text-base text-center text-[14px] sm:text-2xl lg:text-lg relative  mt-[0.75em] ">
                        
                    </p>
                </div>
            </div>
           
        </section>
       
    </div>

    </>
  )
}

export default ScrollTriggerSection