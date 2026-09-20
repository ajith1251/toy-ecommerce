import { LandingHero, SocialProof, ProductProof, FeaturedToys, FeatureRows, FinalCta } from '../components/sections/landing/Landing';

/**
 * The home page is a single quiet landing in the cofounder.co design
 * language: type-led, generous whitespace, one idea per section. Store
 * browsing lives on /products.
 */
export default function HomePage() {
  return (
    <main>
      <LandingHero />
      <SocialProof />
      <ProductProof />
      <FeaturedToys />
      <FeatureRows />
      <FinalCta />
    </main>
  );
}
