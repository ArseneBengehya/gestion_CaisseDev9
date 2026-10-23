import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { telephone, nomComplet, motDePasse, role, moisEnRetard, moisImpayesNoms, montantCotisationDuh, penalite, totalDuh } = body;

    if (!telephone) {
      return NextResponse.json({ error: 'Numéro de téléphone requis' }, { status: 400 });
    }

    // Nettoyage et formatage du numéro (RDC +243)
    let cleanPhone = telephone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '243' + cleanPhone.substring(1);
    }

    // Déterminer si c'est un message de bienvenue (avec mot de passe) ou une relance de retard
    let message = '';

    if (motDePasse) {
      // Message de bienvenue / Identifiants d'accès
      message = 
`BIENVENUE SUR LA CAISSE DEV9

Bonjour ${nomComplet},

Votre compte membre a été créé avec succès.

Voici vos identifiants pour vous connecter à votre espace :

Identifiant : ${telephone}
Mot de passe : ${motDePasse}
Rôle : ${role === 'ADMIN' ? 'Administrateur' : 'Membre Simple'}

Connectez-vous dès maintenant pour suivre vos cotisations et prêts.

_Caisse Dev9 - Administration_`;
    } else {
      // Message de relance de retard (ton code d'origine)
      const listeMoisStr = moisImpayesNoms ? moisImpayesNoms.join(', ') : '';
      message = 
`
Bonjour *${nomComplet}*,

Sauf erreur de notre part, votre compte présente un retard de cotisation.

Nombre de mois en retard : ${moisEnRetard} mois
Mois concernés : ${listeMoisStr}
Cotisations dues : ${montantCotisationDuh ? montantCotisationDuh.toLocaleString() : 0} FC
Pénalités applicables : ${penalite ? penalite.toLocaleString() : 0} FC

TOTAL À RÉGULARISER : ${totalDuh ? totalDuh.toLocaleString() : 0} FC

Merci d'effectuer votre versement auprès de la trésorerie pour régulariser votre dossier.

_Caisse Dev9 - Système Automatisé de Gestion_`;
    }

    const INSTANCE_ID = process.env.GREENAPI_INSTANCE_ID;
    const API_TOKEN = process.env.GREENAPI_API_TOKEN;

    // Vérification si les identifiants API sont bien configurés
    if (!INSTANCE_ID || !API_TOKEN || INSTANCE_ID === 'VOTRE_INSTANCE_ID') {
      return NextResponse.json(
        { error: "Les clés Green API (INSTANCE_ID / API_TOKEN) ne sont pas configurées dans le fichier .env.local" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.green-api.com/waInstance${INSTANCE_ID}/sendMessage/${API_TOKEN}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: `${cleanPhone}@c.us`,
          message: message,
        }),
      }
    );

    // Lire la réponse en texte d'abord pour éviter le crash si l'API renvoie du HTML ou du vide
    const responseText = await response.text();
    let data;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      data = { message: responseText || 'Erreur de réponse de l’API WhatsApp' };
    }

    if (!response.ok) {
      throw new Error(data.message || `Erreur HTTP ${response.status} de l'API WhatsApp`);
    }

    return NextResponse.json({ success: true, messageId: data.idMessage });
  } catch (error: any) {
    console.error('Erreur API WhatsApp:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}