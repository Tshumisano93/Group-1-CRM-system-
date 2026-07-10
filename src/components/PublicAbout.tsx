import React from "react";
import { Award, Compass, Shield, Heart, CheckCircle2, TrendingUp, Building2, Terminal } from "lucide-react";

export default function PublicAbout() {
  const values = [
    {
      title: "Batho Pele (People First)",
      desc: "Putting the needs and aspirations of our community members at the forefront of all planning and service provision decisions.",
      icon: <Heart className="text-red-600" size={24} />
    },
    {
      title: "Transparency & Honesty",
      desc: "Adhering strictly to moral standards, offering complete access to municipal performance metrics and councillor activities.",
      icon: <Shield className="text-gov-blue" size={24} />
    },
    {
      title: "Accountability",
      desc: "Accepting complete responsibility for public assets, infrastructure conditions, and response timeliness in all 41 wards.",
      icon: <Compass className="text-gov-green" size={24} />
    },
    {
      title: "Professional Excellence",
      desc: "Developing technical systems and digital CRM operations to deliver rapid, efficient, and top-tier services.",
      icon: <Award className="text-gov-yellow" size={24} />
    }
  ];

  const objectives = [
    "To accelerate basic service delivery (clean water, reliable energy, and waste disposal) to all rural and urban areas.",
    "To foster local economic development (LED) by building premium municipal infrastructure and business zones.",
    "To ensure sustainable environmental management and refuse collection standards in line with national CoGTA frameworks.",
    "To modernize municipal administration using custom-designed CRM portals, eliminating paperwork bottlenecks.",
    "To advance public safety, health, and athletic amenities within local villages, sports complexes, and schools."
  ];

  return (
    <div id="public-about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      
      {/* 1. Page Header & Introduction */}
      <div className="text-center max-w-4xl mx-auto space-y-4">
        <span className="bg-gov-green/10 text-gov-green font-bold text-xs uppercase tracking-widest px-3 py-1.5 rounded-full border border-gov-green/20">
          Know Your Municipality
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight">
          About Thulamela Municipality
        </h1>
        <div className="w-24 h-1 bg-gov-yellow mx-auto"></div>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Thulamela Local Municipality (LIM473) is located in the northernmost parts of South Africa, nestled within the Vhembe District Municipality of the Limpopo Province. As a Category B municipality with 41 distinct local wards, it boasts a vibrant blend of historical heritage and dynamic municipal development.
        </p>
      </div>

      {/* 2. Grid for History & Strategic Vision */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* History Column */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-xl font-black text-gov-green uppercase tracking-tight flex items-center">
            <Building2 className="mr-2 text-gov-yellow" size={20} />
            <span>History & Background</span>
          </h2>
          <div className="border-t border-slate-100 pt-4 text-xs text-slate-600 space-y-4 leading-relaxed">
            <p>
              Established following the local government restructuring process in South Africa, Thulamela Municipality shares its administrative borders with Collins Chabane and Makhado Municipalities. The municipality's headquarters are situated in Thohoyandou, the former capital of the Venda Bantustan.
            </p>
            <p>
              The name <strong>"Thulamela"</strong> is derived from a highly significant historical Iron Age site located in the northern section of the Kruger National Park, signifying a place that represents growth, rise, and cultural heritage.
            </p>
            <p>
              Today, Thulamela hosts a large population with diverse needs, from major commercial centres like Thohoyandou and Sibasa to expansive agricultural villages. This geographic spread drives our dedication to bridging the urban-rural divide through standard-setting service delivery.
            </p>
          </div>
          
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mt-6">
            <h4 className="font-bold text-xs text-gov-blue uppercase">Service Excellence Statement</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              "We pledge to serve our residents with utmost dignity, responding to infrastructure alerts within designated timeframes, keeping ward leadership informed, and building a local state that operates for the benefit of all citizens."
            </p>
          </div>
        </div>

        {/* Vision & Mission Column */}
        <div className="lg:col-span-5 space-y-6">
          {/* Vision card */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-3 relative overflow-hidden border-l-4 border-l-gov-green">
            <h3 className="text-gov-green font-extrabold uppercase text-xs tracking-widest">Our Vision</h3>
            <h2 className="text-xl font-bold font-sans uppercase tracking-wide leading-snug text-slate-900">
              "To be the leading, sustainable and development-driven municipality in South Africa."
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed pt-2">
              Striving to set the benchmark for infrastructure development, public safety, and financial accountability among local government departments nationally.
            </p>
          </div>

          {/* Mission card */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-3 relative overflow-hidden border-l-4 border-l-gov-blue">
            <h3 className="text-gov-blue font-extrabold uppercase text-xs tracking-widest">Our Mission</h3>
            <p className="text-xs text-slate-700 leading-relaxed font-semibold">
              "To build a sustainable, progressive and model municipality through transparent public service delivery, robust community participation and total municipal infrastructure stewardship."
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Empowering our communities through public education, consultative ward forums, and the deployment of advanced electronic communication technologies.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Core Values Section */}
      <div className="space-y-6">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Our Core Values</h2>
          <p className="text-xs text-slate-500 mt-1">Guided by the Batho Pele principles to deliver respectful public care</p>
          <div className="w-12 h-1 bg-gov-yellow mx-auto mt-2"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((v, i) => (
            <div key={i} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col space-y-3">
              <div className="bg-slate-50 w-12 h-12 rounded-xl flex items-center justify-center">
                {v.icon}
              </div>
              <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider">{v.title}</h3>
              <p className="text-[11px] text-slate-600 leading-relaxed flex-grow">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Strategic Objectives & Digital Transformation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Strategic Objectives */}
        <div className="lg:col-span-6 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-lg font-black text-slate-950 uppercase tracking-tight flex items-center">
              <TrendingUp className="mr-2 text-gov-blue" size={20} />
              <span>Strategic Objectives</span>
            </h3>
            <div className="w-12 h-0.5 bg-gov-yellow"></div>
            
            <ul className="space-y-3 pt-2">
              {objectives.map((obj, i) => (
                <li key={i} className="flex items-start text-xs text-slate-600 leading-relaxed">
                  <CheckCircle2 className="mr-2.5 text-gov-green flex-shrink-0 mt-0.5" size={14} />
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Digital Transformation Vision */}
        <div className="lg:col-span-6 bg-white border border-slate-200 text-slate-900 p-6 sm:p-8 rounded-2xl flex flex-col justify-between relative overflow-hidden border-l-4 border-l-slate-800 shadow-sm">
          <div className="space-y-4 relative z-10">
            <span className="text-gov-blue font-mono text-[10px] uppercase tracking-wider font-extrabold block">
              Modernizing Thulamela
            </span>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
              Digital Transformation Vision
            </h3>
            <div className="w-12 h-0.5 bg-gov-yellow"></div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              Thulamela Local Municipality recognizes that the future of public service delivery lies in rapid, transparent digital channels. By building the Complaint Relationship Management (CRM) system, we aim to:
            </p>
            
            <ul className="space-y-2 pt-2 text-[11px] text-slate-500">
              <li className="flex items-center">
                <span className="w-1.5 h-1.5 bg-gov-yellow rounded-full mr-2"></span>
                Eliminate administrative delays by feeding Councillor complaints directly to field technicians.
              </li>
              <li className="flex items-center">
                <span className="w-1.5 h-1.5 bg-gov-yellow rounded-full mr-2"></span>
                Provide transparent tracking logs for every pothole, electrical issue, and sewerage problem.
              </li>
              <li className="flex items-center">
                <span className="w-1.5 h-1.5 bg-gov-yellow rounded-full mr-2"></span>
                Utilize spatial data reports to allocate fiscal budgets dynamically according to ward requirements.
              </li>
            </ul>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-6 flex justify-between items-center text-[10px] font-mono text-slate-400 relative z-10">
            <span>PLATFORM VER: 1.0.0</span>
            <span className="text-gov-green font-bold uppercase">BATHU PELE DIGITAL CO-OP</span>
          </div>
        </div>
      </div>

    </div>
  );
}
