import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] overflow-x-hidden">
      {/* Hero Section */}
      <header className="relative w-full h-[90vh] overflow-hidden flex items-center justify-center bg-surface-container-low">
        <div className="absolute inset-0 z-0">
          <div
            className="w-full h-full bg-cover bg-center transition-transform duration-[10000ms] hover:scale-110"
            style={{
              backgroundImage:
                "url('/assets/休闲白衣.jpg')",
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-canvas-white/80"></div>
        </div>
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto flex flex-col items-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="font-label-caps text-label-caps tracking-[0.3em] text-earth-taupe mb-6 uppercase"
          >
            AI 换发 · 换妆 · 换装
          </motion.h2>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
            className="font-headline-display text-headline-display text-ink-black mb-12 leading-tight"
          >
            AI 照片换发<br/>智能美学新体验
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
          >
            <Link
              to="/transform"
              className="inline-block px-10 py-4 bg-ink-black text-white font-label-caps text-label-caps hover:bg-earth-taupe transition-all duration-300 tracking-widest active:scale-95 no-underline"
            >
              立即开始
            </Link>
          </motion.div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-6 md:px-8 py-12">
        {/* Strategic AI Studio Section */}
        <section className="mb-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="flex flex-col md:flex-row items-end justify-between mb-16 gap-8"
          >
            <div className="max-w-2xl">
              <span className="font-label-caps text-label-caps text-earth-taupe block mb-4">
                AI HAIR STYLIST PRO
              </span>
              <h2 className="font-headline-lg text-headline-lg text-ink-black mb-6">
                AI 驱动的一站式形象变换
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                上传一张照片，AI 即可为您生成多种发型、妆容和穿搭效果。基于阿里云通义万相大模型，
                在保留人物身份特征的前提下精准变换形象细节，为个人形象设计提供无限的灵感可能。
              </p>
            </div>
            <div className="hidden md:block">
              <div className="w-px h-24 bg-earth-taupe/30"></div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-12 gap-4"
          >
            <div className="md:col-span-8 perspective-card transition-transform duration-700 ease-out hover:-translate-y-2">
              <div className="relative group overflow-hidden bg-linen-beige h-[500px]">
                <img
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  alt="Texture"
                  src="/assets/发型/女士/大波浪.png"
                />
                <div className="absolute bottom-0 left-0 p-8 bg-white/70 backdrop-blur-md w-full translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                  <h3 className="font-headline-md text-headline-md text-ink-black mb-2">
                    AI 智能换发
                  </h3>
                  <p className="font-label-md text-label-md text-on-surface-variant">
                    基于通义万相大模型，真实保留人物特征
                  </p>
                </div>
              </div>
            </div>
            <div className="md:col-span-4 flex flex-col gap-4">
              <div className="flex-1 bg-surface-container-high p-8 flex flex-col justify-center items-center text-center group cursor-pointer hover:bg-earth-taupe hover:text-white transition-colors duration-500">
                <div className="mb-4 group-hover:scale-110 transition-transform">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m21 21-4.3-4.3" />
                    <path d="M12.2 4.4a5 5 0 0 0-7 7.1l11 11.2a2 2 0 0 0 2.8 0 2 2 0 0 0 0-2.8z" />
                    <path d="m4.5 13.5 6-6" />
                    <path d="m9.5 8.5 6 6" />
                  </svg>
                </div>
                <h4 className="font-label-caps text-label-caps mb-2">妆容变换</h4>
                <p className="text-sm opacity-70">AI 生成多种精致妆容效果</p>
              </div>
              <div className="flex-1 relative overflow-hidden group perspective-card transition-transform duration-700 ease-out hover:-translate-y-2">
                <img
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                  alt="Model Profile"
                  src="/assets/妆容/日式氛围感妆容.png"
                />
              </div>
            </div>
          </motion.div>
        </section>

        {/* Extraction Results Section */}
        <section className="mb-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-center mb-20"
          >
            <h2 className="font-headline-lg text-headline-lg text-ink-black mb-4">AI 变换效果展示</h2>
            <p className="font-label-md text-label-md text-earth-taupe tracking-widest uppercase">
              TRANSFORMATION SHOWCASE
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-12"
          >
            {[
              { src: '/assets/发型/男士/狼尾剪.png', title: '发型变换', desc: 'AI 智能生成多种适配发型' },
              { src: '/assets/妆容/温柔蜜桃妆.png', title: '妆容变换', desc: 'AI 精准模拟多种妆效风格' },
              { src: '/assets/发型/女士/黑长直.png', title: '穿搭变换', desc: 'AI 呈现多种穿搭风格效果' },
            ].map((item, i) => (
              <div key={i} className={`group ${i === 1 ? 'translate-y-0 md:translate-y-12' : ''}`}>
                <div className="aspect-[3/4] mb-6 overflow-hidden bg-linen-beige border border-outline-variant/30">
                  <img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={item.title} src={item.src} />
                </div>
                <div className="space-y-2">
                  <h3 className="font-label-caps text-label-caps text-ink-black">{item.title}</h3>
                  <p className="font-body-md text-on-surface-variant italic">{item.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </section>

        {/* CTA Section */}
        <section className="py-24 border-t border-outline-variant">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="font-headline-display text-headline-display text-ink-black mb-8 italic">
              开始你的 AI 形象变换之旅
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-12">
              上传照片，让 AI 为你打造全新的形象方案。
            </p>
            <Link
              to="/transform"
              className="inline-block px-12 py-5 bg-ink-black text-white font-label-caps text-label-caps tracking-widest hover:bg-earth-taupe transition-all active:scale-95 no-underline"
            >
              立即体验
            </Link>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-lowest py-20 px-6 md:px-8 border-t border-outline-variant">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          <div>
            <div className="font-headline-md text-headline-md text-ink-black mb-4">AI 美学工坊</div>
            <p className="font-label-md text-label-md text-on-surface-variant max-w-xs">
              AI 驱动的一站式形象变换平台，<br />为个人形象设计提供无限灵感可能。
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-16">
            <div>
              <h5 className="font-label-caps text-label-caps text-ink-black mb-6">SERVICES</h5>
              <ul className="space-y-3 font-label-md text-label-md text-on-surface-variant">
                <li className="hover:text-earth-taupe cursor-pointer">AI 换发</li>
                <li className="hover:text-earth-taupe cursor-pointer">AI 换妆</li>
                <li className="hover:text-earth-taupe cursor-pointer">AI 换装</li>
              </ul>
            </div>
            <div>
              <h5 className="font-label-caps text-label-caps text-ink-black mb-6">FEATURES</h5>
              <ul className="space-y-3 font-label-md text-label-md text-on-surface-variant">
                <li className="hover:text-earth-taupe cursor-pointer">素材提取</li>
                <li className="hover:text-earth-taupe cursor-pointer">素材库</li>
                <li className="hover:text-earth-taupe cursor-pointer">风格分析</li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <h5 className="font-label-caps text-label-caps text-ink-black mb-6">NEWSLETTER</h5>
              <div className="flex border-b border-earth-taupe py-2">
                <input
                  className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-on-surface-variant/50 outline-none"
                  placeholder="邮箱地址"
                  type="email"
                />
                <button className="text-ink-black ml-2">
                  <ArrowRight strokeWidth={1.5} size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-outline-variant/30 flex justify-between items-center opacity-50">
          <span className="font-label-caps text-[10px]">© 2024 AI HAIR STYLIST PRO. ALL RIGHTS RESERVED.</span>
          <div className="flex gap-6">
            <span className="font-label-caps text-[10px] cursor-pointer hover:text-ink-black">PRIVACY</span>
            <span className="font-label-caps text-[10px] cursor-pointer hover:text-ink-black">TERMS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
