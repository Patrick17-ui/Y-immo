# Y-immo
La gestion locative digitale 
Y-Immo — SaaS de gestion locative pour le Cameroun

Objectif : digitaliser la gestion locative à Yaoundé et sécuriser les paiements de loyer par mobile money. Application web responsive, installable comme une application (PWA), bilingue Français / English.

Deux espaces, deux usages
1. Espace Propriétaire / Gestionnaire

Module	Ce que ça fait
Tableau de bord	Taux d'occupation, loyers perçus vs impayés du mois, alertes de retard (J+1, J+5)
Patrimoine	Créer / modifier / supprimer des immeubles (nom, adresse, quartier) et des logements (appartement, studio, boutique) avec loyer mensuel et statut occupé/vacant
Locataires	Fiche complète : nom, téléphone, e-mail, CNI numérisée, garant (nom + téléphone), logement associé et date d'entrée — consultation , modification  et suppression ( avec libération automatique du logement)
Paiements	Historique des transactions par locataire, filtrable par mois, statuts payé / en attente / en retard
Charges	Factures Eneo / Camwater globales, réparties automatiquement par quote-part entre les locataires
Contrats de bail	Génération d'un bail conforme OHADA, aperçu avant téléchargement, choix de la langue d'impression (FR/EN), export PDF, suppression
2. Espace Locataire
Module	Ce que ça fait
Mon loyer	Montant du loyer du mois + bouton Payer
Paiement mobile	Orange Money et MTN MoMo via Monetbil — le locataire valide sur son téléphone, l'app vérifie le statut automatiquement toutes les 5 secondes
Reçus	Quittance de loyer téléchargeable après validation du paiement
Réclamations	Signalement de pannes (fuite d'eau, électricité…) avec photo jointe
Historique	Tous ses paiements passés

 Comptes et sécurité
Connexion par e-mail / mot de passe ou « Continuer avec Google »
Rôles owner / tenant stockés côté serveur (pas de contournement possible depuis le navigateur)
Liaison automatique : quand vous enregistrez un locataire avec son e-mail, son compte se rattache automatiquement à sa fiche à la connexion — c'est pour ça qu'il faut renseigner l'e-mail dans le formulaire propriétaire
Toutes les données protégées au niveau de la base (RLS) ; les CNI et photos dans un espace de stockage privé, jamais accessible publiquement
PDF : contrats et quittances générés dans le navigateur (jsPDF)
Comment l'exécuter (version ZIP téléchargée)

npm install        # installer les dépendances
npm run dev        # lancer en local → http://localhost:5173
npm run build      # générer la version de production
npm run test       # lancer les tests
npm run lint       # vérifier la qualité du code

 Feuille de route

Fait À venir
Patrimoine, locataires, paiements Monetbil, reçus, contrats OHADA, réclamations	Notifications SMS/WhatsApp (retards), OTP par SMS
	État des lieux photo avant/après, calculateur de préavis
	Mode hors-ligne, application Android
