import Navbar from "@/components/HomePageLayout/Navbar";
import Hero from "@/components/HomePageLayout/Hero";
import Features from "@/components/HomePageLayout/Features";
import Empower from "@/components/HomePageLayout/Empower";
import Services from "@/components/HomePageLayout/Services";
import Quote from "@/components/HomePageLayout/Quote";
import Steps from "@/components/HomePageLayout/Steps";
import Testimonials from "@/components/HomePageLayout/Testimonials";
import Blog from "@/components/HomePageLayout/Blog";
import Experts from "@/components/HomePageLayout/Experts";
import CTA from "@/components/HomePageLayout/CTA";
import Footer from "@/components/HomePageLayout/Footer";

export default function HomePage() {
  return (
    <div className="bg-[#F4F8FC]">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Empower />
        <Services />
        <Quote />
        <Steps />
        <Testimonials />
        <Blog />
        <Experts />
        <CTA />
        <Footer />
      </main>
    </div>
  );
}