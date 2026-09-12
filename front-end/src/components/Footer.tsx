
import {FaInstagram,FaLinkedin,FaGithub, FaMedium} from "react-icons/fa";
import { MdOutlineMailOutline} from "react-icons/md";
import { SiGooglemaps } from "react-icons/si";


const Footer = () => {
  return (
    <>
      <footer className="relative flex h-auto w-full flex-col gap-8 overflow-x-hidden px-4 pb-20 pt-10 sm:px-6 md:flex-row md:items-start md:gap-10 xl:h-124 xl:px-0 xl:pb-20">
        <div className="flex w-full max-w-2xl flex-col gap-5 sm:gap-6 items-start text-left pl-0 md:pl-8 xl:pl-15 pt-8">
          <div className="w-44 sm:w-52 md:w-48 lg:w-52 xl:w-60 shrink-0"><img src="/assets/horizontal_Logo.svg" alt="Deerwalk Data Society logo" /></div>
          <div className="leading-6 w-full max-w-full sm:w-[80%] md:w-[72%] xl:w-[85%]" ><p className="text-xs sm:text-sm md:text-[0.8rem] lg:text-[0.85rem] xl:text-sm wrap-break-word text-justify">Deerwalk Data Society is a community based in Deerwalk Institute of Technology and aims to literate people through data by collecting data through surveys, college infrastructure and provide a report to the students and faculties whilst revealing interesting stories and patterns lying underneath the raw data.</p>
          </div>
          </div>

          <div className="flex w-full flex-col gap-8 sm:gap-10 pt-8 pr-0 md:ml-auto md:w-auto md:items-start xl:pr-15 items-center text-center">
            <div className="flex w-full justify-center md:justify-start">
              <div className="inline-flex w-full max-w-92 flex-col items-center text-center">
                <h2 className="w-full whitespace-nowrap border-b border-gray-100 pb-2 text-lg sm:text-2xl md:text-xl lg:text-2xl text-center">CONTACT US AT</h2>
                <div className="flex flex-col gap-4 mt-5 text-xl sm:text-2xl md:text-lg lg:text-xl justify-center items-center">
                  <div className="flex flex-row gap-4 items-center">
                    <MdOutlineMailOutline className="hover:text-[#00c2a8] cursor-pointer shrink-0" />
                    <a href="mailto:deerwalkdatasociety@deerwalk.edu.np" className="whitespace-nowrap text-[13px] sm:text-[20px] md:text-sm lg:text-base hover:text-[#00c2a8]">
                      deerwalkdatasociety@deerwalk.edu.np
                    </a>
                  </div>
                  <div className="flex flex-row gap-4 items-center">
                    <a href="" target="_blank" rel="noopener noreferrer">
                      <SiGooglemaps className="hover:text-[#00c2a8] cursor-pointer shrink-0" />
                    </a>
                    <a href="https://maps.app.goo.gl/uQRGkF7CNe4Z8EU38" target="_blank" rel="noopener noreferrer" className="whitespace-nowrap text-[13px] sm:text-[20px] md:text-sm lg:text-base hover:text-[#00c2a8]">
                      Sifal, Kathmandu
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

            <div className="flex w-full justify-center md:justify-start">
              <div className="inline-flex w-full max-w-92 flex-col items-center text-center">
                <h2 className="w-full whitespace-nowrap border-b border-gray-100 pb-2 text-lg sm:text-2xl md:text-xl lg:text-2xl text-center">VISIT OUR SOCIALS</h2>
                <div className="flex flex-row gap-4 mt-5 text-xl sm:text-2xl md:text-lg lg:text-xl justify-center items-center">
                  <a href="https://www.linkedin.com/company/deerwalk-data-society/home/"><FaLinkedin className="hover:text-blue-600 cursor-pointer" /></a>
                  <a href="https://www.instagram.com/deerwalkdatasociety/"><FaInstagram className="hover:text-pink-500 cursor-pointer" /></a>
                  <a href="https://medium.com/@deerwalkdatasociety"><FaMedium className="hover:text-blue-400 cursor-pointer" /></a>
                  <a href="https://github.com/dwit-data-society"><FaGithub className="hover:text-purple-600 cursor-pointer" /></a>
                </div>
              </div>
            </div>
          </div>



            
       <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
         <p className="text-sm text-gray-200 text-center">
                © 2026 Data Society. All Rights Reserved.
        </p>
       </div>
       
      
        

    </footer>
    </>
  )
}

export default Footer;