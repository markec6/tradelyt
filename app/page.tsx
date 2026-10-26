import { Navigation } from "@/components/hero/navigation"
import { HeaderSection } from "@/components/hero/header-section"
import { ProductMockup } from "@/components/hero/product-mockup"
import { RobotSection } from "@/components/hero/robot-section"
import { LiveShowcaseSection } from "@/components/live-showcase/live-showcase-section"
import { PartnerProgramSection } from "@/components/partner-program/partner-program-section"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Background Grid Pattern */}
      <div 
        className="fixed inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />
      
      {/* Ambient Glow Effects */}
      <div className="fixed top-0 left-1/3 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed top-1/2 right-0 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Navigation */}
      <Navigation />
      
      {/* Hero Content */}
      <div className="relative">
        <HeaderSection />
        <ProductMockup />
        <RobotSection />
      </div>

      <LiveShowcaseSection />
      <PartnerProgramSection />
    </main>
  )
}
