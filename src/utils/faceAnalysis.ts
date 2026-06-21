import type { HairType, HairstyleRecommendation, StyleRecommendation } from '../types';

function mapToHairType(name: string): HairType {
  const kw = name.toLowerCase();
  if (kw.includes('寸头') || kw.includes('板寸')) return 'buzz';
  if (kw.includes('波波') || kw.includes('齐耳') || kw.includes('齐下巴') || kw.includes('锁骨')) return 'bob';
  if (kw.includes('羊毛卷') || kw.includes('卷发') || kw.includes('烫')) return 'wool';
  if (kw.includes('长发') || kw.includes('长直') || kw.includes('大波浪')) return 'long';
  if (kw.includes('短发') || kw.includes('碎发') || kw.includes('纹理')) return 'short';
  if (kw.includes('慵懒')) return 'long';
  return 'short';
}

function parseSectionRecs(section: string): StyleRecommendation[] {
  if (!section.trim()) return [];
  const recs: StyleRecommendation[] = [];
  const lines = section.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // 【推荐N】名称 - 理由
    let m = trimmed.match(/【推荐\d】\s*(.+?)\s*[-—–]\s*(.+)/);
    if (m) {
      recs.push({ name: m[1].trim(), description: m[2].trim() });
      continue;
    }

    // 推荐N: 名称 - 理由（兜底）
    m = trimmed.match(/推荐\d*[:：]\s*(.+?)\s*[-—–]\s*(.+)/);
    if (m) {
      recs.push({ name: m[1].trim(), description: m[2].trim() });
    }
  }

  return recs;
}

function parseHairstyleRecs(section: string): HairstyleRecommendation[] {
  return parseSectionRecs(section).map(r => ({
    ...r,
    hairType: mapToHairType(r.name),
  }));
}

export function parseFaceAnalysis(analysis: string): {
  analysisText: string;
  hairstyleRecs: HairstyleRecommendation[];
  makeupRecs: StyleRecommendation[];
  outfitRecs: StyleRecommendation[];
} {
  const hairLabel = '二、推荐发型';
  const makeupLabel = '三、推荐妆容';
  const outfitLabel = '四、推荐穿搭';

  const hairIdx = analysis.indexOf(hairLabel);
  const makeupIdx = analysis.indexOf(makeupLabel);
  const outfitIdx = analysis.indexOf(outfitLabel);

  // No sections at all → try old format (【推荐N】 without section header)
  if (hairIdx === -1) {
    const oldMatch = analysis.match(/【推荐\d】/);
    if (oldMatch) {
      const idx = oldMatch.index!;
      const analysisText = analysis.slice(0, idx).trim();
      // Old format: everything from the first recommendation is the hair section
      const hairSection = analysis.slice(idx);
      return {
        analysisText,
        hairstyleRecs: parseHairstyleRecs(hairSection),
        makeupRecs: [],
        outfitRecs: [],
      };
    }
    return {
      analysisText: analysis.trim(),
      hairstyleRecs: [],
      makeupRecs: [],
      outfitRecs: [],
    };
  }

  const analysisText = analysis.slice(0, hairIdx).trim();

  let hairSection = '';
  let makeupSection = '';
  let outfitSection = '';

  if (makeupIdx !== -1) {
    hairSection = analysis.slice(hairIdx + hairLabel.length, makeupIdx);
    if (outfitIdx !== -1) {
      makeupSection = analysis.slice(makeupIdx + makeupLabel.length, outfitIdx);
      outfitSection = analysis.slice(outfitIdx + outfitLabel.length);
    } else {
      makeupSection = analysis.slice(makeupIdx + makeupLabel.length);
    }
  } else if (outfitIdx !== -1) {
    hairSection = analysis.slice(hairIdx + hairLabel.length, outfitIdx);
    outfitSection = analysis.slice(outfitIdx + outfitLabel.length);
  } else {
    hairSection = analysis.slice(hairIdx + hairLabel.length);
  }

  return {
    analysisText,
    hairstyleRecs: parseHairstyleRecs(hairSection),
    makeupRecs: parseSectionRecs(makeupSection),
    outfitRecs: parseSectionRecs(outfitSection),
  };
}

// Old API kept for backward compat with tests — delegates to parseFaceAnalysis
export function parseRecommendedTypes(analysis: string): {
  analysisText: string;
  recommendations: HairstyleRecommendation[];
} {
  const result = parseFaceAnalysis(analysis);
  return {
    analysisText: result.analysisText,
    recommendations: result.hairstyleRecs,
  };
}
