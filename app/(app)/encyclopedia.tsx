import { ComingSoon } from '@/components/ComingSoon';

export default function EncyclopediaScreen() {
  return (
    <ComingSoon
      emoji="📖"
      title="Encyklopédia rýb"
      stage="Pripravujeme v 3. etape"
      features={[
        'Bežné druhy: vhodné pH, teplota, veľkosť, povaha',
        'Kontrola, či sa ryby znesú a či sa zmestia do akvária',
        'Neskôr: rozpoznanie ryby a jej zdravia z fotky',
      ]}
    />
  );
}
