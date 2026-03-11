import LogoPlaceholder from "./LogoPlaceholder";

export default function LoginBrandingPanel() {
  return (
    <>
      {/* Desktop: full left panel */}
      <div className="hidden min-h-screen flex-col items-center justify-center bg-[#1A3A5C] px-12 md:flex">
        <div className="flex flex-col items-center">
          <LogoPlaceholder className="mb-6 h-20 w-20" />
          <h1 className="text-4xl font-bold text-white">Intel Dash</h1>
          <p className="mt-3 text-lg text-[#DBEAFE]">
            Business Intelligence Dashboard
          </p>
        </div>

        {/* Decorative lines */}
        <div className="mt-16 flex flex-col items-center gap-2 opacity-20">
          <div className="h-[2px] w-32 rounded bg-white" />
          <div className="h-[2px] w-24 rounded bg-white" />
          <div className="h-[2px] w-36 rounded bg-white" />
        </div>

        <p className="mt-8 text-sm italic text-[#7BAFD4]">
          Your company data, at a glance.
        </p>
      </div>

      {/* Mobile: compact header */}
      <div className="flex flex-col items-center bg-[#1A3A5C] px-6 py-8 md:hidden">
        <LogoPlaceholder className="mb-3 h-12 w-12" />
        <h1 className="text-2xl font-bold text-white">Intel Dash</h1>
        <p className="mt-1 text-sm text-[#DBEAFE]">
          Business Intelligence Dashboard
        </p>
      </div>
    </>
  );
}
