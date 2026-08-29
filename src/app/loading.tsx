import TbsLogo from "@/components/TbsLogo";

export default function Loading() {
  return (
    <div className="tbs-loader">
      <div className="tbs-loader-logo">
        <TbsLogo size={64} />
      </div>
      <div className="tbs-loader-shadow" />
      <p className="tbs-loader-text">The Boundary Shop</p>
    </div>
  );
}
