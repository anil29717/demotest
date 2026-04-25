/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

const propertyCards = [
  {
    title: "The Aster Residences",
    location: "Bandra West, Mumbai",
    price: "INR 12.4 Cr",
    beds: 4,
    baths: 4,
    sqft: "4,100",
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80",
  },
  {
    title: "Crescent Marina View",
    location: "Worli Sea Face, Mumbai",
    price: "INR 9.8 Cr",
    beds: 3,
    baths: 3,
    sqft: "3,350",
    image:
      "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?auto=format&fit=crop&w=1400&q=80",
  },
  {
    title: "The Parkline Penthouse",
    location: "Koramangala, Bengaluru",
    price: "INR 7.6 Cr",
    beds: 3,
    baths: 3,
    sqft: "2,980",
    image:
      "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1400&q=80",
  },
  {
    title: "Verde Signature Villa",
    location: "Golf Course Road, Gurugram",
    price: "INR 14.2 Cr",
    beds: 5,
    baths: 5,
    sqft: "5,300",
    image:
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1400&q=80",
  },
  {
    title: "The Ivory Collection",
    location: "Alibaug Coastline",
    price: "INR 11.1 Cr",
    beds: 4,
    baths: 4,
    sqft: "4,460",
    image:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb3?auto=format&fit=crop&w=1400&q=80",
  },
  {
    title: "Imperial Courtyard House",
    location: "Lutyens Zone, New Delhi",
    price: "INR 18.7 Cr",
    beds: 6,
    baths: 6,
    sqft: "6,100",
    image:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1400&q=80",
  },
];

const processSteps = [
  {
    id: "01",
    title: "Brief & Positioning",
    description:
      "We align on budget, location strategy, and portfolio targets to define a precise acquisition brief.",
  },
  {
    id: "02",
    title: "Curated Shortlist",
    description:
      "Our advisory engine filters inventory and presents high-fit opportunities with transparent benchmarking.",
  },
  {
    id: "03",
    title: "Deal Structuring",
    description:
      "We coordinate diligence, legal, and offer strategy so every negotiation stays data-backed and compliant.",
  },
  {
    id: "04",
    title: "Closure & Beyond",
    description:
      "From signing to post-acquisition support, we stay embedded to protect asset performance long-term.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FDFCF9] text-[#1A1A1A]">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6">
        <section className="lux-section grid gap-12 pb-36 pt-20 lg:grid-cols-2">
          <div className="flex flex-col justify-center">
            <p className="text-xs font-medium uppercase tracking-[0.35em] text-[#8B7D6B]">
              Modern Luxury Portfolio
            </p>
            <h1 className="mt-6 text-5xl font-bold leading-[0.95] md:text-6xl xl:text-7xl">
              Curated
              <span className="ml-3 italic font-medium text-neutral-500">Prime Assets</span>
              <br />
              For Visionary Buyers
            </h1>
            <p className="mt-8 max-w-xl text-lg text-neutral-600">
              Discover architecture-led residences and high-performing investment homes across
              India&apos;s most desirable locations.
            </p>

            <div className="mt-10 flex items-center gap-4">
              <div className="flex -space-x-3">
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80"
                  alt="Client avatar"
                  className="h-11 w-11 rounded-full border-2 border-[#FDFCF9] object-cover"
                />
                <img
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80"
                  alt="Client avatar"
                  className="h-11 w-11 rounded-full border-2 border-[#FDFCF9] object-cover"
                />
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                  alt="Client avatar"
                  className="h-11 w-11 rounded-full border-2 border-[#FDFCF9] object-cover"
                />
              </div>
              <span className="rounded-full border border-[rgba(139,125,107,0.2)] bg-white px-4 py-2 text-sm font-medium text-[#1A1A1A]">
                +2k private clients
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="lux-image-frame aspect-[4/3] rounded-[24px] shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1800&q=80"
                alt="Luxury home exterior"
                className="lux-image h-full w-full object-cover"
              />
            </div>

            <div className="absolute -bottom-20 left-1/2 z-10 w-[90%] -translate-x-1/2 rounded-2xl border border-[rgba(139,125,107,0.2)] bg-white p-6 shadow-xl">
              <div className="grid gap-4 md:grid-cols-4 md:gap-0">
                {[
                  { label: "Location", value: "South Mumbai" },
                  { label: "Type", value: "Penthouse" },
                  { label: "Price", value: "INR 8Cr+" },
                ].map((item) => (
                  <div key={item.label} className="md:border-r md:border-[rgba(139,125,107,0.2)] md:px-4">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-400">{item.label}</p>
                    <p className="mt-1 text-lg font-bold text-[#1A1A1A]">{item.value}</p>
                  </div>
                ))}
                <button className="lux-button flex h-full items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] px-5 py-3 text-sm font-medium text-white">
                  Search
                  <span aria-hidden>→</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="lux-section">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.32em] text-[#8B7D6B]">About us</p>
              <h2 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
                Precision advisory for exceptional real estate decisions
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-6">
              {[
                { value: "2.4K", label: "transactions closed" },
                { value: "INR 5.1K Cr", label: "portfolio value" },
                { value: "18", label: "premium micro-markets" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-3xl font-bold md:text-4xl">{stat.value}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-[#8B7D6B]">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Portfolio Strategy",
                copy: "Align acquisitions to long-term appreciation, rental yield, and lifestyle outcomes.",
              },
              {
                title: "Controlled Access",
                copy: "Private listings, qualified intros, and discreet advisory with full transaction governance.",
              },
              {
                title: "Institutional Rigor",
                copy: "Due diligence, comparables, and deal monitoring that mirrors institutional processes.",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="group lux-card rounded-[24px] bg-white p-8 transition-all duration-300 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-xl transition-colors group-hover:bg-[#1A1A1A] group-hover:text-white">
                  ◆
                </div>
                <h3 className="mt-6 text-2xl font-bold">{item.title}</h3>
                <p className="mt-4 text-neutral-600">{item.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="properties" className="lux-section">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.32em] text-[#8B7D6B]">Featured collection</p>
              <h2 className="mt-4 text-4xl font-bold md:text-5xl">Signature Properties</h2>
            </div>
            <Link href="/dashboard" className="nav-underline text-sm font-medium uppercase tracking-[0.24em]">
              View Portfolio
            </Link>
          </div>

          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {propertyCards.map((property) => (
              <article key={property.title} className="lux-card rounded-[24px] bg-white p-4">
                <div className="lux-image-frame relative aspect-[4/3] rounded-[20px]">
                  <img src={property.image} alt={property.title} className="lux-image h-full w-full object-cover" />
                  <button className="absolute right-3 top-3 rounded-full bg-white/85 px-3 py-2 backdrop-blur">
                    ♡
                  </button>
                  <span className="absolute bottom-3 left-3 rounded-full bg-[#1A1A1A] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white">
                    New Listing
                  </span>
                </div>

                <div className="px-2 pb-2 pt-5">
                  <h3 className="text-xl font-bold">{property.title}</h3>
                  <p className="mt-2 flex items-center gap-2 text-sm text-neutral-500">
                    <span aria-hidden>📍</span>
                    {property.location}
                  </p>
                  <p className="mt-3 text-2xl font-bold text-[#1A1A1A]">{property.price}</p>

                  <div className="mt-5 flex gap-6 border-t border-[rgba(139,125,107,0.2)] pt-4 text-sm text-neutral-500">
                    <span>🛏 {property.beds} Beds</span>
                    <span>🛁 {property.baths} Baths</span>
                    <span>⬚ {property.sqft} sqft</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="process" className="lux-section">
          <div className="mb-12">
            <p className="text-xs font-medium uppercase tracking-[0.32em] text-[#8B7D6B]">How it works</p>
            <h2 className="mt-4 text-4xl font-bold md:text-5xl">A Refined Four-Step Journey</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {processSteps.map((step) => (
              <article key={step.id} className="relative rounded-2xl bg-neutral-50 p-10">
                <p className="absolute right-5 top-4 text-6xl font-bold text-[#1A1A1A]/10">{step.id}</p>
                <div className="mb-8 text-2xl text-[#D4AF37]">✦</div>
                <h3 className="text-2xl font-bold">{step.title}</h3>
                <p className="mt-4 text-neutral-600">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="contact"
          className="lux-section mb-24 rounded-[24px] bg-[#1A1A1A] px-8 py-16 text-white md:px-12 lg:grid lg:grid-cols-2 lg:gap-10"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "20px 20px, 40px 40px",
            backgroundPosition: "0 0, 10px 10px",
          }}
        >
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-[#D4AF37]">Lead capture</p>
            <h2 className="mt-4 text-5xl font-bold leading-tight md:text-6xl">
              Let&apos;s Build Your
              <br />
              Next Landmark Portfolio
            </h2>
            <p className="mt-6 max-w-md text-neutral-300">
              Share your requirements and our advisory desk will return with a tailored shortlist,
              pricing intelligence, and an execution timeline.
            </p>
          </div>

          <form className="mt-10 rounded-[24px] bg-white p-10 text-[#1A1A1A] lg:mt-0">
            {["Full Name", "Email Address", "Phone Number", "Investment Range"].map((field) => (
              <label key={field} className="mb-6 block">
                <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#8B7D6B]">
                  {field}
                </span>
                <input
                  type="text"
                  className="mt-2 w-full border-0 border-b border-[rgba(139,125,107,0.2)] bg-transparent px-0 py-2 text-[#1A1A1A] outline-none focus:border-[#1A1A1A]"
                />
              </label>
            ))}
            <button className="lux-button group mt-2 flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#1A1A1A] py-4 text-white transition-all hover:opacity-90">
              Submit Enquiry
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">✈</span>
            </button>
          </form>
        </section>

        <p className="pb-10 text-sm text-[#8B7D6B]">
          By proceeding, you agree to confidential communication and premium-market compliance
          standards.
        </p>
      </main>
    </div>
  );
}
