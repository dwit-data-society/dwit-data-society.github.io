"use client";



const InfiniteCarousel = () => {
    const slides = [
        {str:"DATA DRIVEN "},
        {str:"ANALYTICS ",},
        {str:"VISUALIZATION ",},
        {str:"INSIGHTS "},

    ]


    const group = Array(6).fill(slides).flat();
      




  return (
    <>
        <div className="flex w-full h-[20svh] items-center  overflow-hidden " style={{
                         maskImage:"linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
                        WebkitMaskImage:"linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
      }}>
            <div className="flex w-max gap-10 animate-infinite-carousel" >
            {[...group,...group].map((slide,index)=>(
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

export default InfiniteCarousel;