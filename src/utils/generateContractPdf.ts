import jsPDF from 'jspdf';

interface ContractData {
  tenantName: string;
  unitName: string;
  buildingName: string;
  monthlyRent: number;
  startDate: string;
  endDate: string | null;
  contractType: 'residential' | 'commercial';
  language: 'fr' | 'en';
  ownerName?: string;
}

export function generateContractPdf(data: ContractData, preview?: boolean): jsPDF {
  const doc = new jsPDF();
  const isFr = data.language === 'fr';
  const margin = 22;
  let y = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;

  const formatAmount = (n: number) => new Intl.NumberFormat('fr-FR').format(n);
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(isFr ? 'fr-FR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const typeName = isFr
    ? data.contractType === 'residential' ? "BAIL D'HABITATION" : 'BAIL COMMERCIAL'
    : data.contractType === 'residential' ? 'RESIDENTIAL LEASE' : 'COMMERCIAL LEASE';

  const checkPage = (needed: number) => {
    if (y + needed > 275) { doc.addPage(); y = 25; }
  };

  // ── Header band ──
  doc.setFillColor(24, 57, 105);
  doc.rect(0, 0, pageWidth, 38, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(`CONTRAT DE ${typeName}`, pageWidth / 2, 18, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(isFr ? 'Conforme aux dispositions OHADA' : 'OHADA compliant', pageWidth / 2, 28, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y = 48;

  // ── Building info ──
  doc.setFillColor(240, 244, 248);
  doc.roundedRect(margin, y, contentWidth, 18, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(isFr ? 'Immeuble :' : 'Building:', margin + 6, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(data.buildingName || '—', margin + 40, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.text(isFr ? 'Logement :' : 'Unit:', margin + 6, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.text(data.unitName || '—', margin + 40, y + 14);
  y += 26;

  // ── Section helper ──
  const addSection = (num: number, title: string, body: string) => {
    checkPage(35);
    // Section header
    doc.setFillColor(24, 57, 105);
    doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`  ARTICLE ${num} — ${title}`, margin + 2, y + 5.5);
    doc.setTextColor(0, 0, 0);
    y += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(body, contentWidth - 4);
    checkPage(lines.length * 5 + 5);
    doc.text(lines, margin + 2, y);
    y += lines.length * 5 + 8;
  };

  // ── Articles ──
  addSection(1, isFr ? 'LES PARTIES' : 'PARTIES',
    isFr
      ? `Le présent contrat est conclu entre :\n• Le Bailleur : ${data.ownerName || '(Propriétaire)'}\n• Le Locataire : ${data.tenantName}\n\nLes deux parties reconnaissent avoir la capacité juridique de contracter.`
      : `This contract is entered into between:\n• The Landlord: ${data.ownerName || '(Owner)'}\n• The Tenant: ${data.tenantName}\n\nBoth parties acknowledge having legal capacity to contract.`
  );

  addSection(2, isFr ? 'OBJET DU BAIL' : 'LEASE OBJECT',
    isFr
      ? `Le Bailleur met à la disposition du Locataire le logement « ${data.unitName} » situé dans l'immeuble « ${data.buildingName} », à usage ${data.contractType === 'residential' ? "d'habitation" : 'commercial'}.\n\nLe bien est loué en l'état actuel, le Locataire déclarant le connaître pour l'avoir visité.`
      : `The Landlord provides the Tenant with the unit "${data.unitName}" located in building "${data.buildingName}", for ${data.contractType} use.\n\nThe property is rented as-is, the Tenant declaring knowledge of its condition from a prior visit.`
  );

  const durationText = isFr
    ? `Le bail prend effet le ${formatDate(data.startDate)}${data.endDate ? ` et prendra fin le ${formatDate(data.endDate)}` : ', pour une durée indéterminée'}.\n\nEn cas de reconduction tacite, le bail sera renouvelé aux mêmes conditions pour une durée identique.`
    : `The lease takes effect on ${formatDate(data.startDate)}${data.endDate ? ` and ends on ${formatDate(data.endDate)}` : ', for an indefinite period'}.\n\nIn case of tacit renewal, the lease will be renewed under the same conditions for an identical duration.`;
  addSection(3, isFr ? 'DURÉE' : 'DURATION', durationText);

  addSection(4, isFr ? 'LOYER ET CONDITIONS DE PAIEMENT' : 'RENT AND PAYMENT TERMS',
    isFr
      ? `Le loyer mensuel est fixé à ${formatAmount(data.monthlyRent)} FCFA (${numberToWordsFr(data.monthlyRent)} francs CFA), payable au plus tard le 5 de chaque mois.\n\nTout retard de paiement supérieur à 15 jours entraînera une pénalité de 10% du montant dû.\n\nLe loyer est payable par tout moyen accepté par le Bailleur (espèces, mobile money, virement bancaire).`
      : `The monthly rent is set at ${formatAmount(data.monthlyRent)} XAF, payable no later than the 5th of each month.\n\nAny payment delay exceeding 15 days will incur a penalty of 10% of the amount due.\n\nRent is payable by any method accepted by the Landlord (cash, mobile money, bank transfer).`
  );

  addSection(5, isFr ? 'DÉPÔT DE GARANTIE' : 'SECURITY DEPOSIT',
    isFr
      ? `Le Locataire versera un dépôt de garantie équivalent à deux (2) mois de loyer, soit ${formatAmount(data.monthlyRent * 2)} FCFA, à la signature du présent contrat.\n\nCe dépôt sera restitué en fin de bail, déduction faite des éventuelles réparations à la charge du Locataire.`
      : `The Tenant shall pay a security deposit equivalent to two (2) months' rent, i.e. ${formatAmount(data.monthlyRent * 2)} XAF, upon signing this contract.\n\nThis deposit will be returned at the end of the lease, minus any repairs chargeable to the Tenant.`
  );

  addSection(6, isFr ? 'OBLIGATIONS DU LOCATAIRE' : 'TENANT OBLIGATIONS',
    isFr
      ? `Le Locataire s'engage à :\n• Payer le loyer et les charges aux échéances convenues\n• Entretenir les lieux en bon état de propreté et de réparations locatives\n• Ne pas sous-louer sans l'autorisation écrite du Bailleur\n• Respecter le règlement intérieur de l'immeuble\n• Signaler sans délai toute dégradation au Bailleur\n• Restituer les lieux en bon état à la fin du bail`
      : `The Tenant agrees to:\n• Pay rent and charges on time\n• Maintain the premises in good condition\n• Not sublease without written authorization from the Landlord\n• Respect the building rules\n• Report any damage to the Landlord without delay\n• Return the premises in good condition at the end of the lease`
  );

  addSection(7, isFr ? 'OBLIGATIONS DU BAILLEUR' : 'LANDLORD OBLIGATIONS',
    isFr
      ? `Le Bailleur s'engage à :\n• Délivrer le logement en bon état d'usage\n• Assurer la jouissance paisible des lieux au Locataire\n• Effectuer les réparations majeures (structure, toiture, installations principales)\n• Fournir les quittances de loyer sur demande`
      : `The Landlord agrees to:\n• Deliver the property in good working condition\n• Ensure the Tenant's peaceful enjoyment of the premises\n• Perform major repairs (structure, roof, main installations)\n• Provide rent receipts upon request`
  );

  addSection(8, isFr ? 'RÉSILIATION' : 'TERMINATION',
    isFr
      ? `Le bail pourra être résilié :\n• Par le Locataire : avec un préavis de trois (3) mois notifié par écrit\n• Par le Bailleur : en cas de non-paiement du loyer pendant deux (2) mois consécutifs, après mise en demeure restée sans effet pendant 30 jours\n• D'un commun accord entre les parties\n\nEn cas de résiliation anticipée par le Locataire, le dépôt de garantie restera acquis au Bailleur.`
      : `The lease may be terminated:\n• By the Tenant: with three (3) months' written notice\n• By the Landlord: in case of non-payment of rent for two (2) consecutive months, after a formal notice remains unanswered for 30 days\n• By mutual agreement between the parties\n\nIn case of early termination by the Tenant, the security deposit shall be retained by the Landlord.`
  );

  addSection(9, isFr ? 'JURIDICTION' : 'JURISDICTION',
    isFr
      ? `Tout litige relatif à l'exécution du présent contrat sera soumis aux tribunaux compétents du lieu de situation de l'immeuble, conformément aux dispositions de l'Acte uniforme OHADA relatif au droit commercial général.`
      : `Any dispute relating to the execution of this contract shall be submitted to the competent courts of the location of the property, in accordance with the provisions of the OHADA Uniform Act on General Commercial Law.`
  );

  // ── Signatures ──
  checkPage(50);
  y += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.text(isFr ? 'Fait en deux exemplaires originaux.' : 'Made in two original copies.', margin, y);
  y += 5;
  doc.text(
    isFr ? `Fait à ________________, le ${formatDate(data.startDate)}` : `Done at ________________, on ${formatDate(data.startDate)}`,
    margin, y
  );
  y += 15;

  doc.setFont('helvetica', 'bold');
  doc.text(isFr ? 'Le Bailleur' : 'The Landlord', margin, y);
  doc.text(isFr ? 'Le Locataire' : 'The Tenant', pageWidth / 2 + 10, y);
  y += 3;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text(isFr ? '(Signature précédée de la mention "Lu et approuvé")' : '(Signature preceded by "Read and approved")', margin, y + 3);
  doc.text(isFr ? '(Signature précédée de la mention "Lu et approuvé")' : '(Signature preceded by "Read and approved")', pageWidth / 2 + 10, y + 3);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('_______________________', margin, y + 12);
  doc.text('_______________________', pageWidth / 2 + 10, y + 12);
  doc.text(data.ownerName || '', margin, y + 19);
  doc.text(data.tenantName, pageWidth / 2 + 10, y + 19);

  // ── Footer on all pages ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Y-Immo — ${isFr ? 'Gestion locative' : 'Rental management'} | Page ${i}/${totalPages}`, pageWidth / 2, 290, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  if (!preview) {
    doc.save(`contrat_${data.tenantName.replace(/\s+/g, '_')}.pdf`);
  }

  return doc;
}

function numberToWordsFr(n: number): string {
  if (n === 0) return 'zéro';
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

  const convert = (num: number): string => {
    if (num < 20) return units[num];
    if (num < 100) {
      const t = Math.floor(num / 10);
      const u = num % 10;
      if (t === 7 || t === 9) return tens[t] + '-' + units[10 + u];
      return tens[t] + (u ? '-' + units[u] : (t === 8 ? 's' : ''));
    }
    if (num < 1000) {
      const h = Math.floor(num / 100);
      const rest = num % 100;
      const prefix = h === 1 ? 'cent' : units[h] + ' cent';
      return rest === 0 && h > 1 ? prefix + 's' : prefix + (rest ? ' ' + convert(rest) : '');
    }
    if (num < 1000000) {
      const th = Math.floor(num / 1000);
      const rest = num % 1000;
      const prefix = th === 1 ? 'mille' : convert(th) + ' mille';
      return prefix + (rest ? ' ' + convert(rest) : '');
    }
    const m = Math.floor(num / 1000000);
    const rest = num % 1000000;
    const prefix = m === 1 ? 'un million' : convert(m) + ' millions';
    return prefix + (rest ? ' ' + convert(rest) : '');
  };

  return convert(Math.floor(n));
}
