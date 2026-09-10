import { Navbar } from "@/components/navbar";
import background from "@/assets/samplebg.svg";

export default function Home() {
  return (
    <div
      className="site-background min-h-screen bg-black text-white"
      style={{ backgroundImage: `url(${background.src})`, fontFamily: "Montserrat, sans-serif" }}
    >
      <Navbar />
    </div>
  );
}
