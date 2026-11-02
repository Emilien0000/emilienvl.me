// Format : [Catégorie, Question, BONNE réponse, Faux1, Faux2, Faux3, Source, Niveau de priorité]
// Niveaux de priorité : 4 = Résumé, 3 = Cours (notions marquées d'une étoile dans le cahier), 2 = Cahier, 1 = Diapo, 0 = Standard
const QUESTIONS = [
// ───────── INTRODUCTION ─────────
  ["Introduction","Quels sont les 4 piliers d'un réseau ?","Tolérance aux fautes, Scalabilité, QoS, Sécurité","Règles, Support, Message, Équipements","Vitesse, Coût, Distance, Équipements","Routage, Commutation, Encapsulation, Adressage","Cahier - Résumé", 4],
  ["Introduction","Quels sont les 4 éléments d'un réseau ?","Règles, Support, Message, Équipements","Tolérance aux fautes, Scalabilité, QoS, Sécurité","Émetteur, Récepteur, Routeur, Switch","Couche 1, couche 2, couche 3, couche 4","Cahier - Introduction", 2],
  ["Introduction","Que signifie « tolérance aux fautes » dans un réseau ?","Si un routeur tombe en panne, la donnée prend un autre chemin","Le réseau corrige automatiquement les fautes de frappe","Le réseau bloque tout le trafic en cas de panne","Le réseau chiffre les données en cas d'erreur","Cahier - Introduction", 2],
  ["Introduction","Quels sont les facteurs externes qui affectent la communication ?","La qualité du chemin, le nombre de messages simultanés, le nombre de changements de forme du message","La taille, la complexité et l'importance du message","Le coût, l'environnement, les équipements et la distance","Les règles, le support, le message et les équipements","Cahier - Introduction", 2],
  ["Introduction","Parmi ces choix, lequel est un facteur interne affectant la communication réseau ?","La taille du message","La qualité du chemin","Le nombre de messages transmis simultanément","Le nombre de fois où le message change de forme","Cahier - Introduction", 2],

// ───────── COMMUNICATION & MÉDIAS ─────────
  ["Communication","De quoi a-t-on besoin pour communiquer ?","Un émetteur, un récepteur, des règles (langage, vitesse...) et un support (média)","Un routeur, un switch et un pare-feu","Une adresse IP et une adresse MAC","Un serveur DNS et un serveur DHCP","Cahier - Communication", 2],
  ["Communication","Quels sont les trois types de supports (médias) de communication mentionnés dans le cours ?","Cuivre, Fibre, Sans fil","Air, Eau, Terre","Câble coaxial, USB, Bluetooth","Fibre, ADSL, 4G","Cahier - Communication", 2],
  ["Communication","De quoi dépend le succès d'une communication sur un média ?","De la qualité du chemin","De la couleur du câble","Du système d'exploitation de l'émetteur","De la marque du routeur","Cahier - Communication", 2],
  ["Communication","Quels sont les critères principaux pour choisir un média de communication ?","Coût, Environnement, Équipements, Distance","Débit, Poids, Couleur","Taille, Marque, Âge","Aucun de ces critères","Cahier - Communication", 2],
  ["Communication","Quel critère de choix d'un média est souvent une forte contrainte ?","L'environnement","La marque du câble","La couleur du connecteur","L'âge de l'installation","Cahier - Communication", 2],
  ["Communication","Pourquoi utiliser des protocoles standards (ex: IEEE) ?","Pour permettre à des protocoles différents de fonctionner entre eux (ex: HTTP, TCP, IP)","Pour réduire la vitesse du réseau","Pour forcer l'utilisation d'une seule marque","Pour empêcher les mises à jour","Cahier - Communication", 2],
  ["Communication","Quel avantage apporte l'interopérabilité des protocoles lors d'une mise à jour ?","Si un protocole est mis à jour, le reste n'est pas impacté","Tous les protocoles doivent être mis à jour en même temps","Le réseau doit être redémarré entièrement","Les anciennes données sont perdues","Cahier - Communication", 2],
  ["Communication","Quels protocoles interviennent pour afficher une page web ?","HTTP, TCP et IP","ARP, DHCP et NAT","FTP, SMTP et POP","RIP, OSPF et BGP","Cahier - Communication", 2],

// ───────── MODÈLES OSI / TCP-IP ─────────
  ["Modèles","Quelle est la différence structurelle entre le modèle OSI et le modèle TCP/IP ?","OSI a 7 couches, TCP/IP a 4 couches","OSI a 4 couches, TCP/IP a 7 couches","Les deux ont 7 couches","Les deux ont 4 couches","Cahier - Résumé", 4],
  ["Modèles","Quelles couches OSI sont regroupées dans la couche Application du modèle TCP/IP ?","Application, Présentation, Session","Transport, Réseau, Liaison","Session, Transport, Réseau","Uniquement la couche Application","Cahier - Résumé", 4],
  ["Modèles","À quelle couche TCP/IP correspond la couche Réseau (Network) du modèle OSI ?","Internet","Transport","Network Access","Application","Cahier - Résumé", 4],
  ["Modèles","Quelles couches OSI sont regroupées dans la couche Network Access de TCP/IP ?","Liaison de données (Data Link) et Physique","Réseau et Transport","Session et Présentation","Application et Transport","Cahier - Résumé", 4],
  ["Modèles","Quelle couche TCP/IP détermine le meilleur chemin à travers le réseau ?","Internet","Application","Transport","Network Access","Cahier - Résumé", 4],
  ["Modèles","Quelle couche TCP/IP contrôle les équipements matériels et les médias du réseau ?","Network Access","Internet","Transport","Application","Cahier - Résumé", 4],
  ["Modèles","Quelles sont les couches qui présentent les parallèles clés entre OSI et TCP/IP ?","Transport et Réseau","Application et Physique","Session et Liaison","Présentation et Transport","Cahier - Résumé", 4],
  ["Modèles","Quels sont les avantages d'utiliser un modèle en couches ?","Aide à la conception, concurrence entre fabricants, langage commun","Réduit la complexité matérielle mais bloque l'innovation","Augmente la bande passante automatiquement","Il n'y a aucun avantage technique","Cahier - Modèle en couches", 2],
  ["Modèles","Comment est défini le modèle TCP/IP ?","Il est ouvert et défini par des RFC","Il est propriétaire et défini par un constructeur","Il est secret et réservé aux FAI","Il est défini par l'IANA uniquement","Cahier - Modèle en couches", 2],

// ───────── SÉCURITÉ PHYSIQUE ─────────
  ["Sécurité","Quelle mesure relève de la sécurité physique d'un réseau ?","Le contrôle d'accès (badge, vidéosurveillance)","Le chiffrement des mots de passe","L'installation d'un antivirus","La mise à jour du système d'exploitation","Cahier - Résumé", 4],
  ["Sécurité","Quelles protections matérielles sont citées pour la sécurité physique ?","Armoire verrouillée, salle serveurs dédiée, protection contre les sinistres (onduleur)","Pare-feu logiciel, antivirus, VPN","Mots de passe forts et double authentification","Sauvegardes dans le cloud","Cahier - Résumé", 4],
  ["Sécurité","À quoi sert un onduleur dans le cadre de la sécurité physique ?","À protéger les équipements contre les sinistres (coupures de courant...)","À filtrer les paquets entrants","À attribuer des adresses IP","À chiffrer les communications","Cahier - Résumé", 4],

// ───────── DÉFINITIONS ─────────
  ["Définitions","Qu'est-ce qu'un média (support) de communication ?","Le chemin que prend la donnée","L'adresse d'un équipement","Un protocole de routage","Le format d'un message","Cahier - Définitions", 2],
  ["Définitions","Que signifie QoS et à quoi cela sert-il ?","Quality of Service : prioriser les flux (ex: streaming)","Quantity of Signals : compter les paquets","Quick Online Session : accélérer les connexions","Query of Servers : interroger un serveur DNS","Cahier - Définitions", 2],
  ["Définitions","Que signifie LAN ?","Local Area Network","Large Area Network","Long Access Node","Linked Address Network","Cahier - Définitions", 2],
  ["Définitions","Que signifie WAN et à quoi correspond-il ?","Wide Area Network (fournisseur d'accès Internet)","Wireless Access Node (réseau Wi-Fi local)","Wide Address Network (table d'adresses)","Web Application Network (serveur web)","Cahier - Définitions", 2],
  ["Définitions","Que signifie PDU ?","Protocol Data Unit (data, segment, trame, bits...)","Packet Delivery Unit","Port Definition Unit","Private Data Utility","Cahier - Définitions", 2],
  ["Définitions","Qu'est-ce qu'un protocole ?","Des règles de communication qui définissent le format des messages, le chemin...","Un câble qui relie deux équipements","Une adresse unique attribuée à un équipement","Un logiciel de navigation web","Cahier - Définitions", 2],
  ["Définitions","Que signifie l'acronyme MTU dans les réseaux ?","La taille maximum d'un PDU","Le temps maximum de transmission","L'adresse physique d'une carte réseau","Un protocole de routage","Cahier - Définitions", 2],
  ["Définitions","À quoi sert le protocole NAT ?","Traduire les adresses privées en adresses publiques","Chiffrer les mots de passe","Découper un réseau en sous-réseaux","Attribuer une adresse IP automatiquement","Cahier - Définitions", 2],
  ["Définitions","À quoi sert le VLSM ?","Découper un réseau en sous-réseaux avec des masques de taille variable","Traduire les adresses privées en adresses publiques","Prioriser les flux de streaming","Retransmettre les données perdues","Cahier - Définitions", 2],
  ["Définitions","Quelle est la différence entre une communication Half-Duplex et Full-Duplex ?","Half-Duplex : émet ou reçoit (pas en même temps), Full-Duplex : simultanément","Half-Duplex : seulement émission, Full-Duplex : seulement réception","Half-Duplex est plus rapide que Full-Duplex","Il n'y a aucune différence","Cahier - Définitions", 2],

// ───────── ÉQUIPEMENTS ─────────
  ["Équipements","Quel est le rôle d'un équipement final (PC, imprimante...) dans un réseau ?","Servir d'interface entre l'humain et le réseau","Régénérer les signaux électriques","Appliquer la qualité de service (QoS) et filtrer","Transporter les paquets IP","Cahier - Communiquer sur un réseau", 2],
  ["Équipements","Quel est le rôle d'un équipement intermédiaire (Hub, Switch...) ?","Régénérer les signaux, appliquer la QoS et filtrer","Servir d'interface avec l'humain","Générer la donnée utile","Afficher les pages web","Cahier - Communiquer sur un réseau", 2],
  ["Équipements","Quel équipement relie plusieurs réseaux entre eux ?","Le routeur","Le hub","L'imprimante","Le câble UTP","Cahier - Routage", 2],

// ───────── ADRESSES ─────────
  ["Adresses","À quelle couche correspond l'adresse MAC ?","Couche 2","Couche 3","Couche 4","Couche 1","Cahier - Modèle en couches", 2],
  ["Adresses","À quelle couche correspond l'adresse IP ?","Couche 3","Couche 2","Couche 4","Couche 1","Cahier - Modèle en couches", 2],
  ["Adresses","À quelle couche correspond la notion de Port ?","Couche 4","Couche 2","Couche 3","Couche 7","Cahier - Modèle en couches", 2],
  ["Adresses","Que représente l'adresse MAC, résumée par « Qui suis-je localement ? » ?","L'identité de la carte réseau, pour la communication locale","La position dans le réseau, permettant le routage","Le service applicatif visé","Le nom de domaine du site","Cahier - Adressage IP et MAC", 2],
  ["Adresses","Que représente l'adresse IP, résumée par « Où suis-je dans le réseau ? » ?","Un équipement dans un réseau, ce qui permet le routage","La carte réseau, pour la communication locale","Le protocole de transport utilisé","Le câblage physique","Cahier - Adressage IP et MAC", 2],
  ["Adresses","À quoi sert le protocole ARP ?","Faire correspondre une adresse IP avec une adresse MAC","Attribuer une adresse IP automatiquement","Transformer un nom de site en adresse IP","Traduire une adresse privée en adresse publique","Cahier - ARP", 2],
  ["Adresses","Quelle table utilise le protocole ARP ?","La table ARP","La table de routage","La table DNS","La table NAT","Cahier - ARP", 2],

// ───────── ENCAPSULATION & PDU ─────────
  ["Encapsulation","Quel est le nom du PDU au niveau de la couche Transport ?","Segment","Paquet (Packet)","Trame (Frame)","Bits","Cahier - Encapsulation", 3],
  ["Encapsulation","Quel est le nom du PDU au niveau de la couche Réseau (Network) ?","Paquet (Packet)","Segment","Trame (Frame)","Donnée (Data)","Cahier - Encapsulation", 3],
  ["Encapsulation","Quel est le nom du PDU au niveau de la couche Liaison de données (Data Link) ?","Trame (Frame)","Paquet","Segment","Bits","Cahier - Encapsulation", 3],
  ["Encapsulation","Quel est le PDU de la couche Physique ?","Les bits","Le segment","Le paquet","La trame","Cahier - Encapsulation", 3],
  ["Encapsulation","Quels headers ajoute-t-on lors de l'encapsulation, en passant de la couche 4 à la couche 3 puis 2 ?","Transport header, puis Network header, puis Frame header et trailer","Frame header, puis Network header, puis Transport header","Uniquement un header de couche 7","Aucun header, seulement un trailer","Cahier - Encapsulation", 3],
  ["Encapsulation","Quelles informations contiennent les headers lors de l'encapsulation (couche 3) ?","L'adresse source et l'adresse de destination","Le contenu chiffré du message","Le nombre de collisions détectées","Le nom du navigateur utilisé","Cahier - Encapsulation", 3],
  ["Encapsulation","Quelle est la première étape du processus de communication ?","Créer la donnée utile (ex: remplir une page web)","Transporter le segment","Décapsuler la donnée","Envoyer la donnée à l'application concernée","Cahier - Processus de communication", 3],
  ["Encapsulation","Dans le processus de communication, que se passe-t-il juste avant d'envoyer la donnée à l'application concernée lors de la réception ?","On décapsule et on réassemble la donnée","On génère la donnée","On transporte le segment","On formate et encapsule la data","Cahier - Processus de communication", 3],
  ["Encapsulation","Que fait l'hôte de destination lors de la décapsulation ?","Il vérifie l'adresse et remonte le PDU","Il ajoute de nouveaux headers","Il choisit le prochain routeur","Il supprime la donnée utile","Cahier - Couche 3", 2],
  ["Encapsulation","Le routage est assuré par les routeurs : que devient le PDU pendant ce transfert ?","Il reste intact","Il est décapsulé jusqu'à la couche 7","Il est converti en bits puis supprimé","Il est compressé","Cahier - Couche 3", 2],
  ["Encapsulation","Quels sont les 4 processus fondamentaux de la couche Réseau ?","Adressage, Encapsulation, Routage, Décapsulation","Segmentation, Transmission, Réception, Affichage","Discover, Offer, Request, Acknowledge","Codage, Compression, Chiffrement, Routage","Cahier - Couche 3", 3],

// ───────── COUCHE 7 - APPLICATION ─────────
  ["Application","Quel est le rôle de la couche Application ?","Faire l'interface avec les applications utilisateurs","Router les paquets entre réseaux","Transmettre des bits bruts","Encapsuler les paquets en trames","Cahier - Couche 7", 2],
  ["Application","Quels sont des protocoles de la couche Application ?","HTTP, FTP, SMTP, DNS","TCP, UDP","IPv4, IPv6, IPX","Ethernet, PPP, HDLC","Cahier - Couche 7", 2],
  ["Application","Quel est le rôle de la couche Présentation (modèle OSI) ?","Codage, conversion, compression et chiffrement","Créer et relancer les dialogues","Router les paquets IP","Contrôler le flux et l'ordre des données","Cahier - Couche 7", 2],
  ["Application","Quel est le rôle de la couche Session (modèle OSI) ?","Créer, maintenir et relancer les dialogues","Coder et compresser les données","Router les paquets","Encapsuler en trames","Cahier - Couche 7", 2],
  ["Application","Quels sont des exemples de logiciels de la couche Application ?","Un navigateur, un client mail","Un routeur, un switch","Un câble UTP, une fibre","Une adresse MAC, une adresse IP","Cahier - Couche 7", 2],
  ["Application","Que signifie FTP et à quoi sert-il ?","File Transfer Protocol : transférer des fichiers","Fast Transport Protocol : accélérer le routage","Frame Transmission Process : envoyer des trames","Firewall Traffic Policy : filtrer le trafic","Cahier - Couche 7", 2],
  ["Application","À quoi sert Telnet ?","L'accès à distance (accès distant)","Le transfert de fichiers","L'envoi de mails","La résolution de noms de domaine","Cahier - Couche 7", 2],
  ["Application","Comment fonctionne le modèle client-serveur ?","Le serveur répond aux requêtes et peut en traiter plusieurs simultanément","Chaque client stocke les données des autres","Le client répond aux requêtes du serveur","Les données sont réparties sur tous les équipements","Cahier - Couche 7", 2],
  ["Application","Quelle est la particularité d'un réseau Peer-to-Peer (ex: Torrent) ?","Les données sont stockées sur divers équipements","Un seul serveur centralise toutes les données","Il n'y a aucune donnée partagée","Il fonctionne uniquement en Wi-Fi","Cahier - Couche 7", 2],
  ["Application","Que fait le DNS ?","Il transforme un nom de site web en adresse IP (et un port)","Il attribue automatiquement une adresse IP","Il fait le lien entre une IP et une adresse MAC","Il traduit les adresses privées en publiques","Cahier - DNS et DHCP", 2],
  ["Application","Comment fonctionne le DNS ?","Un serveur cherche dans une table la correspondance www → IP","Le client demande l'adresse MAC au routeur","Le switch envoie le nom en broadcast","Le DNS chiffre l'adresse IP","Cahier - Couche 7", 2],
  ["Application","Quels paramètres le DHCP attribue-t-il automatiquement ?","Adresse IP, masque, passerelle, IP du DNS","Adresse MAC, port, protocole","Route par défaut et métrique","Nom de domaine et certificat","Cahier - DNS et DHCP", 2],
  ["Application","Quelles sont les 4 étapes du processus DHCP pour obtenir une IP ?","Discover, Offer, Request, Acknowledge (DORA)","Demand, Obtain, Route, Accept","Discover, Order, Receive, Ack","Request, Offer, Discover, Accept","Cahier - DHCP", 3],
  ["Application","Dans le DHCP, à quoi correspond le message « Discover » (« Tu es là ? ») ?","Le client cherche un serveur DHCP","Le serveur donne une IP","Le client accepte l'offre","Le serveur confirme l'attribution","Cahier - DHCP", 3],
  ["Application","Dans le DHCP, quelle étape consiste à répondre et donner une IP à l'équipement ?","Acknowledge (Ack)","Discover","Offer","Request","Cahier - DHCP", 3],
  ["Application","Quels sont les ports par défaut pour les protocoles HTTP et SMTP ?","HTTP: 80, SMTP: 25","HTTP: 443, SMTP: 110","HTTP: 80, SMTP: 20","HTTP: 21, SMTP: 25","Cahier - Ports connus", 3],
  ["Application","Quel est le port par défaut du protocole POP ?","110","25","80","53","Cahier - Ports connus", 3],
  ["Application","Quels ports utilise le protocole FTP ?","20 et 21","25 et 110","80 et 443","53 et 67","Cahier - Ports connus", 3],
  ["Application","Quel est le port du DNS ?","53","80","25","110","Cahier - Couche 4", 3],
  ["Application","Combien de ports un serveur peut-il écouter ?","Plusieurs ports","Un seul port","Aucun port, il ne fait qu'émettre","Deux ports uniquement : 80 et 25","Cahier - Couche 7", 2],

// ───────── COUCHE 4 - TRANSPORT ─────────
  ["Transport","Quel est le rôle de la couche Transport ?","Segmentation, fiabilité, contrôle du flux","Acheminement des paquets entre réseaux","Transmission de bits bruts","Interface avec les applications","Cahier - Couche 4", 2],
  ["Transport","Quelles tâches la couche Transport effectue-t-elle pour chaque conversation ?","Suivre, segmenter, réassembler et identifier","Router, filtrer et traduire","Coder, compresser et chiffrer","Encapsuler en trame et détecter les collisions","Cahier - Couche 4", 2],
  ["Transport","Quelles sont les caractéristiques de TCP ?","Fiable : accusés de réception, retransmission, contrôle de flux, maintien de l'ordre","Rapide, sans aucune garantie","Sans connexion et sans accusé de réception","Uniquement utilisé pour le streaming","Cahier - TCP vs UDP", 3],
  ["Transport","Quelles sont les caractéristiques d'UDP ?","Rapide, sans garantie","Fiable, avec accusés de réception","Avec retransmission des données perdues","Avec établissement de session","Cahier - TCP vs UDP", 3],
  ["Transport","Quels protocoles applicatifs utilisent TCP ?","HTTP/HTTPS, FTP, SMTP","DNS, VoIP, Streaming","DHCP, ARP, NAT","RIP, OSPF, BGP","Cahier - TCP vs UDP", 3],
  ["Transport","Quels usages conviennent à UDP ?","DNS, VoIP, Streaming","HTTP/HTTPS, FTP, SMTP","Envoi de mails et transfert de fichiers","Aucun usage courant","Cahier - TCP vs UDP", 3],
  ["Transport","Quelle est la différence principale de taille d'en-tête (header) entre TCP et UDP ?","TCP : 20 octets, UDP : 8 octets","TCP : 8 octets, UDP : 20 octets","TCP : 32 octets, UDP : 16 octets","Ils ont tous les deux 20 octets","Cahier - TCP vs UDP", 3],
  ["Transport","Pourquoi UDP est-il plus rapide que TCP ?","Il a un petit en-tête (8 octets) et moins de contrôles","Il retransmet plus vite les données perdues","Il utilise plus de ports","Il chiffre les données","Cahier - TCP vs UDP", 3],
  ["Transport","Quel type d'application privilégie l'ordre et l'intégralité des données ?","Celles qui utilisent TCP","Celles qui utilisent UDP","Celles qui utilisent ARP","Aucune","Cahier - Couche 4", 2],
  ["Transport","Quel type d'application tolère la perte de données et privilégie la vitesse ?","Celles qui utilisent UDP (ex: streaming)","Celles qui utilisent TCP (ex: transfert de fichiers)","Celles qui utilisent DHCP","Celles qui utilisent ARP","Cahier - Couche 4", 2],
  ["Transport","Que signifie « session » dans le contrôle de la conversation ?","Établissement d'une connexion avant l'envoi","Retransmission des données perdues","Numérotation des segments","Régulation des débits","Cahier - Couche 4", 2],
  ["Transport","À quoi correspond la « fiabilité » dans le contrôle de la conversation ?","À la retransmission des données perdues","À la numérotation des segments","À la régulation des débits","À l'établissement d'une connexion","Cahier - Couche 4", 2],
  ["Transport","Comment le protocole TCP assure-t-il l'ordre d'arrivée des données ?","Par la numérotation des segments","Par l'établissement d'une session","Par la régulation des débits","Par l'adresse IP source","Cahier - Couche 4", 2],
  ["Transport","À quoi correspond le « contrôle de flux » ?","À la régulation des débits","À la retransmission des données perdues","À la numérotation des segments","À l'établissement d'une session","Cahier - Couche 4", 2],
  ["Transport","Que permet le multiplexage des connexions ?","Gérer plusieurs conversations simultanées grâce aux numéros de port","Découper un réseau en sous-réseaux","Traduire les adresses privées","Attribuer des adresses IP","Cahier - Couche 4", 2],
  ["Transport","Quel organisme attribue les numéros de ports ?","L'IANA","L'IEEE","L'IETF","L'ARCEP","Cahier - Couche 4", 3],

// ───────── COUCHE 3 - RÉSEAU ─────────
  ["Réseau","Quel est le rôle de la couche Réseau ?","L'acheminement des paquets entre réseaux","La segmentation et la fiabilité","L'interface avec les applications","La transmission des bits bruts","Cahier - Couche 3", 2],
  ["Réseau","Quels protocoles appartiennent à la couche 3 (Réseau) ?","IPv4, IPv6, IPX","TCP, UDP","HTTP, DNS, FTP","Ethernet, PPP, HDLC","Cahier - Couche 3", 2],
  ["Réseau","Quelles sont les plages d'adresses IP privées ?","10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16","10.0.0.0/16, 172.0.0.0/8, 192.0.0.0/12","1.0.0.0/8, 100.16.0.0/12, 200.168.0.0/16","127.0.0.0/8, 169.254.0.0/16, 224.0.0.0/4","Cahier - Couche 3", 3],
  ["Réseau","Quelle plage privée utilise le masque /12 ?","172.16.0.0/12","10.0.0.0/8","192.168.0.0/16","127.0.0.0/8","Cahier - Couche 3", 3],
  ["Réseau","Quelle plage privée utilise le masque /16 ?","192.168.0.0/16","172.16.0.0/12","10.0.0.0/8","169.254.0.0/16","Cahier - Couche 3", 3],
  ["Réseau","Quelle plage privée utilise le masque /8 ?","10.0.0.0/8","172.16.0.0/12","192.168.0.0/16","100.0.0.0/8","Cahier - Couche 3", 3],
  ["Réseau","Quels éléments clés sont associés à la couche Réseau ?","Adressage IP (IPv4, IPv6), routage, fragmentation, MTU, passerelle","Adresse MAC, CSMA/CD, trames","Ports, segmentation, contrôle de flux","Signaux électriques, câblage, connecteurs","Cahier - Couche 3", 2],
  ["Réseau","En adressage IPv4, qu'est-ce que le Unicast ?","Une communication d'un hôte vers un autre hôte","Une communication vers tous les hôtes du réseau","Une communication vers un groupe d'hôtes","Une communication vers le routeur par défaut","Cahier - Adressage IPv4", 2],
  ["Réseau","En adressage IPv4, qu'est-ce que le Broadcast ?","Une communication vers tous les hôtes du réseau (réponse en unicast)","Une communication d'un hôte vers un autre hôte unique","Une communication vers un groupe spécifique d'hôtes","Une communication vers l'extérieur du réseau","Cahier - Adressage IPv4", 2],
  ["Réseau","En adressage IPv4, qu'est-ce que le Multicast ?","Une communication destinée à un groupe spécifique d'hôtes","Une communication d'un hôte vers un autre hôte unique","Une communication vers tous les hôtes du réseau","Une communication vers le routeur par défaut","Cahier - Adressage IPv4", 2],
  ["Réseau","Quels sont les avantages de la segmentation d'un réseau ?","Performance (moins de trafic et de broadcast), sécurité, gestion des adresses","Plus de broadcast et plus de trafic","Suppression du besoin de routeur","Augmentation de la taille des headers","Cahier - Segmentation", 2],
  ["Réseau","Que connaît un hôte dans un réseau segmenté, au niveau de la gestion des adresses ?","Uniquement sa passerelle","Toutes les adresses des autres réseaux","Uniquement l'adresse du serveur DNS","Les tables de routage de tous les routeurs","Cahier - Segmentation", 2],
  ["Réseau","Quelles sont les étapes pour adresser un réseau ?","Hiérarchisation, dimensionnement, adressage","Segmentation, encapsulation, routage","Discover, offer, request","Codage, compression, chiffrement","Cahier - Adressage IPv4", 2],
  ["Réseau","Dans l'architecture de l'Internet, qu'est-ce qu'un réseau de Tiers 1 ?","Un fournisseur connecté directement au backbone (global et rapide)","Un client final","Un fournisseur qui achète de la bande passante au Tiers 2","Un réseau local (LAN) d'entreprise","Cahier - Tiers", 2],
  ["Réseau","Chez qui un fournisseur de Tiers 2 achète-t-il sa connectivité ?","Chez un Tiers 1","Chez un Tiers 3","Il ne l'achète pas, il la produit","Chez un client final","Cahier - Tiers", 2],
  ["Réseau","Chez qui un fournisseur de Tiers 3 achète-t-il sa connectivité ?","Chez un Tiers 2","Chez un Tiers 1 uniquement","Chez un autre Tiers 3","Chez l'IANA","Cahier - Tiers", 2],

// ───────── ROUTAGE ─────────
  ["Routage","Que fait-on si la destination n'est pas dans mon réseau local ?","J'envoie le paquet au routeur","J'envoie le paquet à tous les hôtes","J'abandonne le paquet immédiatement","J'envoie le paquet au serveur DNS","Cahier - Routage", 3],
  ["Routage","Qu'est-ce que la passerelle par défaut ?","L'adresse utilisée pour sortir du réseau local","L'adresse du serveur DNS","L'adresse MAC de la carte réseau","La route vers le réseau 10.0.0.0/8 uniquement","Cahier - Routage", 3],
  ["Routage","Qu'est-ce que le routage statique ?","Une configuration manuelle des routes","Une configuration automatique via des protocoles","Une attribution d'adresses par DHCP","Un routage sans table de routage","Cahier - Routage", 3],
  ["Routage","Qu'est-ce que le routage dynamique ?","Un routage appris automatiquement via des protocoles (RIP, OSPF, BGP, EIGRP)","Une configuration manuelle des routes","Un routage sans routeur","Une traduction d'adresses privées","Cahier - Routage", 3],
  ["Routage","Quels sont des protocoles de routage dynamique ?","RIP, OSPF, BGP, EIGRP","HTTP, FTP, SMTP, DNS","TCP, UDP, ICMP, ARP","Ethernet, PPP, HDLC, CSMA","Cahier - Routage", 3],
  ["Routage","Que fait un routeur si un paquet n'a aucune route correspondante dans sa table de routage ?","Le paquet est abandonné","Il est envoyé à tous les routeurs (Broadcast)","Il est retourné à l'expéditeur","Il est stocké en mémoire","Cahier - Routage", 3],
  ["Routage","Quels sont les 3 éléments qui composent une route dans une table de routage ?","Réseau de destination, Next-hop, Metric","Adresse MAC, Adresse IP, Port","Source, Destination, PDU","Tiers 1, Tiers 2, Tiers 3","Cahier - Routage", 3],
  ["Routage","Que représente le next-hop dans une route ?","La direction vers le prochain routeur","Le but final du paquet","Le critère pour départager plusieurs routes","La taille maximale du paquet","Cahier - Routage", 3],
  ["Routage","À quoi sert la métrique (metric) dans une table de routage ?","À départager plusieurs routes vers une même destination","À définir la taille maximale du paquet","À chiffrer la donnée transmise","À identifier l'adresse physique du routeur","Cahier - Routage", 3],
  ["Routage","Que représente le réseau de destination dans une route ?","Le but final du paquet","Le prochain routeur à traverser","Le critère de départage entre routes","La taille de la table de routage","Cahier - Routage", 3],
  ["Routage","Comment s'écrit la route par défaut en adressage IPv4 ?","0.0.0.0","255.255.255.255","127.0.0.1","192.168.0.1","Cahier - Adressage IPv4", 2],
  ["Routage","Quelles sont les trois actions possibles d'un routeur face à un paquet ?","Le transmettre au destinataire, le transmettre au next-hop, l'abandonner","Le chiffrer, le compresser, le stocker","Le décapsuler, le segmenter, le traduire","Le mettre en file d'attente, le dupliquer, le renvoyer à la source","Cahier - Adressage IPv4", 2],

// ───────── COUCHE 2 - LIAISON DE DONNÉES ─────────
  ["Liaison","Quel est le rôle de la couche Liaison de données ?","Encapsuler les paquets en trames et contrôler l'accès au média","Acheminer les paquets entre réseaux","Fournir un service aux applications","Transmettre des bits bruts sur le support","Cahier - Couche 2", 2],
  ["Liaison","Quels sont les éléments clés de la couche Liaison de données ?","Adresse MAC, protocoles (Ethernet, PPP, HDLC), contrôle d'erreur, détection des collisions","Adresse IP, routage, fragmentation","Ports, TCP, UDP","Signaux électriques, câblage, connecteurs","Cahier - Couche 2", 2],
  ["Liaison","Quels protocoles sont utilisés au niveau de la couche Liaison de données ?","Ethernet, PPP, HDLC","HTTP, FTP, SMTP","TCP, UDP","IPv4, IPv6, IPX","Cahier - Couche 2", 2],
  ["Liaison","Quels mécanismes servent à la détection des collisions en couche 2 ?","CSMA/CD et CSMA/CA","RIP et OSPF","DORA et ARP","TCP et UDP","Cahier - Couche 2", 2],
  ["Liaison","Quel lien la couche 2 fait-elle entre les parties logique et physique ?","Elle fait le lien entre la partie logique et la partie physique","Elle ne fait aucun lien, elle est indépendante","Elle fait le lien entre les applications et le transport","Elle remplace la couche Physique","Cahier - Couche 2", 2],
  ["Liaison","De quoi dépend la méthode de contrôle d'accès au support ?","Du partage du support et de la topologie","Du système d'exploitation de l'hôte","De la taille du message uniquement","Du nombre de ports ouverts","Cahier - Couche 2", 2],
  ["Liaison","De quoi est composée une trame ?","Headers, data, fin de trame","Segment, port, adresse IP","Bits, signaux, connecteurs","Next-hop, metric, destination","Cahier - Couche 2", 2],
  ["Liaison","Que représente une topologie physique ?","Tous les équipements du réseau","Uniquement certains équipements, sans les clients","Les adresses IP et masques de chaque hôte","Les protocoles utilisés par couche","Cahier - Couche 2", 2],
  ["Liaison","Que représente une topologie logique ?","Uniquement certains équipements (pas les clients), avec adresses IP et masque","Tous les équipements physiques du réseau","Le câblage détaillé des salles","La liste des ports ouverts","Cahier - Couche 2", 2],

// ───────── COUCHE 1 - PHYSIQUE ─────────
  ["Physique","Quel est le rôle de la couche Physique ?","Transmettre des bits bruts sur les éléments physiques","Encapsuler les paquets en trames","Acheminer les paquets entre réseaux","Segmenter les données","Cahier - Couche 1", 2],
  ["Physique","Quels sont les éléments clés de la couche Physique ?","Signaux électriques, câblage, connecteurs, normes, encodage et synchronisation des bits","Adresse MAC, trames, CSMA/CD","Adresse IP, routage, MTU","Ports, TCP, UDP","Cahier - Couche 1", 2],
  ["Physique","Quels types de câblage et supports sont cités pour la couche Physique ?","Cuivre (UTP/STP), fibre optique, sans fil","Câble coaxial uniquement","Bluetooth et USB","Satellite uniquement","Cahier - Couche 1", 2],
  ["Physique","Quels organismes de normalisation sont cités pour la couche Physique ?","IEEE, ISO, ITU","IANA, ICANN, W3C","ARCEP, CNIL, ANSSI","IETF, IANA, RFC","Cahier - Couche 1", 2]
];
