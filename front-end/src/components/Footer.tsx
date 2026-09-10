
import {FaFacebook,FaInstagram,FaLinkedin,FaGithub} from "react-icons/fa";
import { MdOutlineMailOutline} from "react-icons/md";
import { SiGooglemaps } from "react-icons/si";

const Footer = () => {
  return (
    <>
      <footer className="w-full h-auto xl:h-124 xl:relative flex flex-col xl:flex-row items-center xl:items-start pt-10 gap-8 xl:gap-0 px-4 sm:px-6 xl:px-0 overflow-x-hidden">
          <div className="flex flex-col sm:flex-row gap-5 sm:gap-10 items-center pl-0 xl:pl-15 pt-8 text-center sm:text-left w-full sm:w-auto">
              <div className="w-32 sm:w-30 shrink-0"><img src="/assets/transparent_Logo.svg" alt="" /></div>
              <div className="leading-7 w-full max-w-full sm:w-[70%] xl:w-[40%] sm:ml-10" ><p className="text-sm sm:text-base break-words">Deerwalk Data Society is a community based in Deerwalk Institute of Technology and aims to literate people through data by collecting data through surveys, college infrastructure and provide a report to the students and faculties whilst revealing interesting stories and patterns lying underneath the raw data.</p>
              </div>
          </div>

          <div className="flex flex-col sm:flex-row xl:ml-auto gap-8 sm:gap-5">
              <div className="flex flex-row gap-10 items-start pt-8 pr-0 xl:pr-15 xl:ml-auto justify-center sm:justify-start">
               <div className="">
              <h2 className="whitespace-nowrap border-b border-gray-100 pb-2  text-lg sm:text-2xl">VISIT OUR SOCIALS</h2>
            <div className="flex flex-row gap-4 mt-5 text-xl sm:text-2xl justify-center">
                <a href=""><FaLinkedin className="hover:text-blue-600 cursor-pointer" /></a>
                <a href=""><FaInstagram className="hover:text-pink-500 cursor-pointer" /></a>
                <a href=""><FaFacebook className="hover:text-blue-400 cursor-pointer" /></a>
                <a href=""><FaGithub className="hover:text-purple-600 cursor-pointer" /></a>
            </div>

            </div>

            </div>  


            


             <div className="flex flex-row gap-10 items-start pt-8 pr-0 xl:pr-25 xl:ml-auto justify-center sm:justify-start">
            <div className="">
              <h2 className="whitespace-nowrap border-b border-gray-100 pb-2  text-lg sm:text-2xl text-center">CONTACT US AT</h2>
            <div className="flex flex-col gap-4 mt-5 text-xl sm:text-2xl justify-center">
              <div className="flex flex-row gap-4 items-center">
                <MdOutlineMailOutline  className="hover:text-[#00c2a8] cursor-pointer shrink-0" /> 
                  <a href="mailto:deerwalkdatasociety@deerwalk.edu.np"className="whitespace-nowrap text-[13px] sm:text-[20px] hover:text-[#00c2a8]">
                        deerwalkdatasociety@deerwalk.edu.np
                  </a>

              </div>
               <div className="flex flex-row gap-4 items-center">
                <a  href="https://maps.app.goo.gl/uQRGkF7CNe4Z8EU38" target="_blank" rel="noopener noreferrer">

                <SiGooglemaps className="hover:text-[#00c2a8] cursor-pointer shrink-0"/>
                </a>
                  <a href="https://maps.app.goo.gl/uQRGkF7CNe4Z8EU38" target="_blank" rel="noopener noreferrer" className="whitespace-nowrap text-[13px] sm:text-[20px] hover:text-[#00c2a8]">
                       Sifal,Kathmandu
                  </a>

              </div>
              

              {/* <div className="flex flex-row gap-4 items-center" >
                <MdPhone className="hover:text-green-500 cursor-pointer shrink-0"/>
                <a href="tel:+977"  className="whitespace-nowrap text-[13px] sm:text-[20px] hover:text-green-500">12345678901</a>
                <p>/</p>
                <a href="tel:+977"  className="text-[13px] sm:text-[20px] hover:text-green-500">121212</a>
                
              </div> */}
            </div>

            </div>
            </div>  

            </div>



            
       <div className=" pb-6 lg:absolute lg:bottom-4 lg:left-1/2 lg:-translate-x-1/2 lg:pb-0">
          <p className="text-sm text-gray-200 text-center">
                © 2026 Data Society. All Rights Reserved.
        </p>
       </div>
       
      
        

    </footer>
    </>
  )
}

export default Footer;






// import {FaFacebook,FaInstagram,FaLinkedin,FaGithub,FaPhoneAlt} from "react-icons/fa";
// import { MdOutlineMailOutline ,MdOutlinePhone,MdPhone} from "react-icons/md";
// import { FaPhone } from "react-icons/fa6";

// const Footer = () => {
//   return (
//     <>
//       <footer className="w-full h-124 absolute flex flex-row   items-start pt-10">
//           <div className="flex flex-row gap-10 items-center pl-15 pt-8">
//               <div className="w-50  "><img src="next.svg" alt="" /></div>
//               <div className="leading-7 w-[40%]" ><p>Lorem ipsum, dolor sit amet consectetur adipisicing elit. Veritatis culpa quia eaque fugit similique hic mollitia unde dolorum repudiandae, enim ipsa dolores provident in debitis, illum quas temporibus dignissimos cupiditate!
//                                                             </p>
//               </div>
//           </div>

//           <div className="flex ml-auto gap-5">
//               <div className="flex flex-row gap-10 items-start pt-8 pr-15 ml-auto">
//                <div className="">
//               <h2 className="whitespace-nowrap border-b border-gray-100 pb-2  text-2xl">VISIT OUR SOCIALS</h2>
//             <div className="flex flex-row gap-4 mt-5 text-2xl justify-center">
//                 <a href=""><FaLinkedin className="hover:text-blue-800 cursor-pointer" /></a>
//                 <a href=""><FaInstagram className="hover:text-pink-500 cursor-pointer" /></a>
//                 <a href=""><FaFacebook className="hover:text-blue-400 cursor-pointer" /></a>
//                 <a href=""><FaGithub className="hover:text-purple-300 cursor-pointer" /></a>
//             </div>

//             </div>

//             </div>  


            


//              <div className="flex flex-row gap-10 items-start pt-8 pr-25 ml-auto">
//             <div className="">
//               <h2 className="whitespace-nowrap border-b border-gray-100 pb-2  text-2xl text-center">CONTACT US AT</h2>
//             <div className="flex flex-col gap-4 mt-5 text-2xl justify-center">
//               <div className="flex flex-row gap-4 items-center">
//                 <MdOutlineMailOutline  className="hover:text-orange-400 cursor-pointer" /> 
//                   <a href="mailto:datasociety.deerwalk@gmail.com"className="whitespace-nowrap text-[20px] hover:text-red-100">
//                         datasociety.deerwalk@gmail.com
//                   </a>

//               </div>
//               <div className="flex flex-row gap-4 items-center" >
//                 <MdPhone className="hover:text-green-500 cursor-pointer"/>
//                 <a href="tel:"  className="whitespace-nowrap text-[20px] hover:text-green-500">12345678901</a>
//                 <p>/</p>
//                 <a href="tel:"  className="text-[20px] hover:text-green-500">12345678901</a>
                
//               </div>
//             </div>

//             </div>
//             </div>  

//             </div>



            
//        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
//           <p className="text-sm text-gray-200">
//                 © 2026 Data Society. All Rights Reserved.
//         </p>
//        </div>
       
      
        

//     </footer>
//     </>
//   )
// }

// export default Footer