import { Ruler, X } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../../context/StoreContext.tsx';

export function SizeGuideModal() {
  const { isSizeGuideOpen, setIsSizeGuideOpen } = useStore();
  const [tab, setTab] = useState<'men' | 'women'>('men');

  if (!isSizeGuideOpen) return null;

  return (
    <div className="fixed inset-0 z-[88] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={() => setIsSizeGuideOpen(false)} />
      <div className="relative z-10 bg-[#F5F3EF] text-[#0A0A0A] max-w-2xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-black/10">
          <div className="flex items-center gap-2.5">
            <Ruler className="w-4 h-4 text-[#9A7B56]" />
            <h2 className="font-editorial text-2xl font-semibold">Atelier Size Guide</h2>
          </div>
          <button
            type="button"
            onClick={() => setIsSizeGuideOpen(false)}
            aria-label="Close size guide"
            className="p-2 hover:opacity-65 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={() => setTab('men')}
            className={`px-4 py-2 text-xs uppercase tracking-[0.12em] font-medium border cursor-pointer ${
              tab === 'men'
                ? 'bg-[#0A0A0A] text-[#F5F3EF] border-[#0A0A0A]'
                : 'border-black/20'
            }`}
          >
            Men&apos;s Measurements
          </button>
          <button
            type="button"
            onClick={() => setTab('women')}
            className={`px-4 py-2 text-xs uppercase tracking-[0.12em] font-medium border cursor-pointer ${
              tab === 'women'
                ? 'bg-[#0A0A0A] text-[#F5F3EF] border-[#0A0A0A]'
                : 'border-black/20'
            }`}
          >
            Women&apos;s Measurements
          </button>
        </div>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="text-xs uppercase tracking-[0.14em] font-semibold text-[#0A0A0A]/70 mb-3">
              Tops, Shirts, Hoodies &amp; Jackets (Inches)
            </h3>
            <div className="overflow-x-auto border border-black/10 bg-white">
              <table className="w-full text-left text-xs tabular-nums">
                <thead className="bg-[#EAE5DC] text-[#0A0A0A]">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Size</th>
                    <th className="py-2.5 px-3 font-semibold">Chest</th>
                    <th className="py-2.5 px-3 font-semibold">Shoulder</th>
                    <th className="py-2.5 px-3 font-semibold">Length</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10 font-mono">
                  {tab === 'men' ? (
                    <>
                      <tr><td className="py-2.5 px-3">S</td><td className="py-2.5 px-3">42&quot;</td><td className="py-2.5 px-3">19.5&quot;</td><td className="py-2.5 px-3">27.5&quot;</td></tr>
                      <tr><td className="py-2.5 px-3">M</td><td className="py-2.5 px-3">44&quot;</td><td className="py-2.5 px-3">20.5&quot;</td><td className="py-2.5 px-3">28.5&quot;</td></tr>
                      <tr><td className="py-2.5 px-3">L</td><td className="py-2.5 px-3">46&quot;</td><td className="py-2.5 px-3">21.5&quot;</td><td className="py-2.5 px-3">29.5&quot;</td></tr>
                      <tr><td className="py-2.5 px-3">XL</td><td className="py-2.5 px-3">49&quot;</td><td className="py-2.5 px-3">22.5&quot;</td><td className="py-2.5 px-3">30.5&quot;</td></tr>
                    </>
                  ) : (
                    <>
                      <tr><td className="py-2.5 px-3">XS</td><td className="py-2.5 px-3">32–33&quot;</td><td className="py-2.5 px-3">15.5&quot;</td><td className="py-2.5 px-3">23.5&quot;</td></tr>
                      <tr><td className="py-2.5 px-3">S</td><td className="py-2.5 px-3">34–35&quot;</td><td className="py-2.5 px-3">16.5&quot;</td><td className="py-2.5 px-3">24.5&quot;</td></tr>
                      <tr><td className="py-2.5 px-3">M</td><td className="py-2.5 px-3">36–37&quot;</td><td className="py-2.5 px-3">17.5&quot;</td><td className="py-2.5 px-3">25.5&quot;</td></tr>
                      <tr><td className="py-2.5 px-3">L</td><td className="py-2.5 px-3">38–40&quot;</td><td className="py-2.5 px-3">18.5&quot;</td><td className="py-2.5 px-3">26.5&quot;</td></tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-[0.14em] font-semibold text-[#0A0A0A]/70 mb-3">
              Trousers, Cargo &amp; Denim (Inches)
            </h3>
            <div className="overflow-x-auto border border-black/10 bg-white">
              <table className="w-full text-left text-xs tabular-nums">
                <thead className="bg-[#EAE5DC] text-[#0A0A0A]">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Size</th>
                    <th className="py-2.5 px-3 font-semibold">Waist</th>
                    <th className="py-2.5 px-3 font-semibold">Inseam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10 font-mono">
                  {tab === 'men' ? (
                    <>
                      <tr><td className="py-2.5 px-3">S / 30</td><td className="py-2.5 px-3">30&quot;</td><td className="py-2.5 px-3">30.5&quot;</td></tr>
                      <tr><td className="py-2.5 px-3">M / 32</td><td className="py-2.5 px-3">32&quot;</td><td className="py-2.5 px-3">31.0&quot;</td></tr>
                      <tr><td className="py-2.5 px-3">L / 34</td><td className="py-2.5 px-3">34&quot;</td><td className="py-2.5 px-3">31.5&quot;</td></tr>
                      <tr><td className="py-2.5 px-3">XL / 36</td><td className="py-2.5 px-3">36&quot;</td><td className="py-2.5 px-3">32.0&quot;</td></tr>
                    </>
                  ) : (
                    <>
                      <tr><td className="py-2.5 px-3">XS / 26</td><td className="py-2.5 px-3">25–26&quot;</td><td className="py-2.5 px-3">30.0&quot;</td></tr>
                      <tr><td className="py-2.5 px-3">S / 28</td><td className="py-2.5 px-3">27–28&quot;</td><td className="py-2.5 px-3">30.5&quot;</td></tr>
                      <tr><td className="py-2.5 px-3">M / 30</td><td className="py-2.5 px-3">29–30&quot;</td><td className="py-2.5 px-3">31.0&quot;</td></tr>
                      <tr><td className="py-2.5 px-3">L / 32</td><td className="py-2.5 px-3">31–32&quot;</td><td className="py-2.5 px-3">31.5&quot;</td></tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
