import LandingHeader from '../components/landing/LandingHeader';
import LandingHero from '../components/landing/LandingHero';
import {
  FeatureSection,
  WorkflowSection,
  LandingCta,
  LandingFooter,
} from '../components/landing/LandingSections';

export default function LandingPage() {
  return (
    <div className="landing-page">
      <LandingHeader />
      <main>
        <LandingHero />
        <FeatureSection />
        <WorkflowSection />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
