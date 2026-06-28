import {
  Star, Heart, Globe, ShieldCheck, BarChart2, Zap, Feather,
  BookOpen, LayoutGrid, MessageSquare, HelpCircle, MousePointer,
  Share2, ScrollText, Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// 섹션 이름(카테고리 무관)을 키워드로 해석해 어울리는 아이콘 반환 — 타입 화면 예시 칩에서 공유 사용.
export function iconFor(label: string): LucideIcon {
  if (/히어로/.test(label)) return Star;
  if (/공감|고민/.test(label)) return Heart;
  if (/세계관|스토리|비전/.test(label)) return Globe;
  if (/안전|인증|보증|GMP/.test(label)) return ShieldCheck;
  if (/성분|영양|원료|함량|임상|인포그래픽/.test(label)) return BarChart2;
  if (/효능|효과|기능|성능|스펙|기술|퍼포먼스/.test(label)) return Zap;
  if (/소재|원단|품질|내구|핏|착용/.test(label)) return Feather;
  if (/사용|설치|복용|레시피|관리|세탁|코디|사이즈|적합|연령|발달|호환|차종/.test(label)) return BookOpen;
  if (/비교|차별/.test(label)) return LayoutGrid;
  if (/후기|리뷰|전문가|추천/.test(label)) return MessageSquare;
  if (/FAQ/.test(label)) return HelpCircle;
  if (/CTA/.test(label)) return MousePointer;
  if (/감성/.test(label)) return Feather;
  if (/SNS|공유/.test(label)) return Share2;
  if (/와디즈/.test(label)) return ScrollText;
  return Sparkles;
}
