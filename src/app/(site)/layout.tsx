import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { DemoModeBanner } from "@/components/layout/demo-banner";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <DemoModeBanner />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
