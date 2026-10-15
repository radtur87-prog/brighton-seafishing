import { ComingSoon } from '@/components/ComingSoon';

export default function WaterScreen() {
  return (
    <ComingSoon
      emoji="💧"
      title="Hodnoty vody"
      stage="Pripravujeme v 2. etape"
      features={[
        'Zápis meraní: pH, GH, KH, NH₃, NO₂, NO₃, Cl₂, teplota',
        'Grafy vývoja pre každé akvárium',
        'Farebné upozornenia: v poriadku / pozor / nebezpečné',
        'Neskôr: odfotenie testovacieho prúžku a automatické vyčítanie',
      ]}
    />
  );
}
