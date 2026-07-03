import MarichoNewsroom from "@/components/community/MarichoNewsroom";

export default function Magazine() {
  return (
    <div className="h-full overflow-y-auto bg-[#0f1011]">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-[#E7E9EA] font-black text-[22px] mb-1">Magazine & Reports</h1>
          <p className="text-[#71767B] text-[13px]">
            Maricho Media publications, policy research, and agricultural intelligence reports.
          </p>
        </div>
        <MarichoNewsroom />
      </div>
    </div>
  );
}
