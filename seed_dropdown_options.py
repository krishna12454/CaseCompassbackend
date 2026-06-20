"""
Django management command to seed dropdown options.
Run with: python manage.py seed_dropdown_options
Safe to run multiple times — it skips options that already exist.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from casemanagement.models.dropdown_model import Dropdown
from casemanagement.models.dropdownField_model import DropdownField


# Format: (dropdown_id, [(en, de, fr, it), ...])
SEED_DATA = [
    # 1. Type of conversation
    (1, [
        ("Phone call", "Telefonanruf", "Appel téléphonique", "Telefonata"),
        ("Email", "E-Mail", "E-mail", "Email"),
        ("In-person meeting", "Persönliches Gespräch", "Rencontre en personne", "Incontro di persona"),
        ("Video call", "Videoanruf", "Appel vidéo", "Videochiamata"),
        ("Letter", "Brief", "Lettre", "Lettera"),
        ("SMS / Chat", "SMS / Chat", "SMS / Chat", "SMS / Chat"),
        ("Internal note", "Interne Notiz", "Note interne", "Nota interna"),
        ("Other", "Andere", "Autre", "Altro"),
    ]),
    # 2. Status
    (2, [
        ("Open", "Offen", "Ouvert", "Aperto"),
        ("In progress", "In Bearbeitung", "En cours", "In corso"),
        ("On hold", "Pausiert", "En attente", "In sospeso"),
        ("Closed", "Geschlossen", "Fermé", "Chiuso"),
        ("Archived", "Archiviert", "Archivé", "Archiviato"),
    ]),
    # 3. Reported by
    (3, [
        ("Self", "Selbst", "Soi-même", "Sé stesso"),
        ("Family member", "Familienmitglied", "Membre de la famille", "Familiare"),
        ("Friend / acquaintance", "Freund/in / Bekannte/r", "Ami(e) / connaissance", "Amico/a / conoscente"),
        ("Professional (social services)", "Fachperson (Sozialdienst)", "Professionnel(le) (services sociaux)", "Professionista (servizi sociali)"),
        ("Professional (school)", "Fachperson (Schule)", "Professionnel(le) (école)", "Professionista (scuola)"),
        ("Professional (healthcare)", "Fachperson (Gesundheitswesen)", "Professionnel(le) (santé)", "Professionista (sanità)"),
        ("Police / authority", "Polizei / Behörde", "Police / autorité", "Polizia / autorità"),
        ("Anonymous", "Anonym", "Anonyme", "Anonimo"),
        ("Other", "Andere", "Autre", "Altro"),
    ]),
    # 4. Canton (all 26 Swiss cantons + Other)
    (4, [
        ("Aargau (AG)", "Aargau (AG)", "Argovie (AG)", "Argovia (AG)"),
        ("Appenzell Ausserrhoden (AR)", "Appenzell Ausserrhoden (AR)", "Appenzell Rhodes-Extérieures (AR)", "Appenzello Esterno (AR)"),
        ("Appenzell Innerrhoden (AI)", "Appenzell Innerrhoden (AI)", "Appenzell Rhodes-Intérieures (AI)", "Appenzello Interno (AI)"),
        ("Basel-Landschaft (BL)", "Basel-Landschaft (BL)", "Bâle-Campagne (BL)", "Basilea Campagna (BL)"),
        ("Basel-Stadt (BS)", "Basel-Stadt (BS)", "Bâle-Ville (BS)", "Basilea Città (BS)"),
        ("Bern (BE)", "Bern (BE)", "Berne (BE)", "Berna (BE)"),
        ("Fribourg (FR)", "Freiburg (FR)", "Fribourg (FR)", "Friburgo (FR)"),
        ("Geneva (GE)", "Genf (GE)", "Genève (GE)", "Ginevra (GE)"),
        ("Glarus (GL)", "Glarus (GL)", "Glaris (GL)", "Glarona (GL)"),
        ("Graubünden (GR)", "Graubünden (GR)", "Grisons (GR)", "Grigioni (GR)"),
        ("Jura (JU)", "Jura (JU)", "Jura (JU)", "Giura (JU)"),
        ("Lucerne (LU)", "Luzern (LU)", "Lucerne (LU)", "Lucerna (LU)"),
        ("Neuchâtel (NE)", "Neuenburg (NE)", "Neuchâtel (NE)", "Neuchâtel (NE)"),
        ("Nidwalden (NW)", "Nidwalden (NW)", "Nidwald (NW)", "Nidvaldo (NW)"),
        ("Obwalden (OW)", "Obwalden (OW)", "Obwald (OW)", "Obvaldo (OW)"),
        ("Schaffhausen (SH)", "Schaffhausen (SH)", "Schaffhouse (SH)", "Sciaffusa (SH)"),
        ("Schwyz (SZ)", "Schwyz (SZ)", "Schwytz (SZ)", "Svitto (SZ)"),
        ("Solothurn (SO)", "Solothurn (SO)", "Soleure (SO)", "Soletta (SO)"),
        ("St. Gallen (SG)", "St. Gallen (SG)", "Saint-Gall (SG)", "San Gallo (SG)"),
        ("Thurgau (TG)", "Thurgau (TG)", "Thurgovie (TG)", "Turgovia (TG)"),
        ("Ticino (TI)", "Tessin (TI)", "Tessin (TI)", "Ticino (TI)"),
        ("Uri (UR)", "Uri (UR)", "Uri (UR)", "Uri (UR)"),
        ("Valais (VS)", "Wallis (VS)", "Valais (VS)", "Vallese (VS)"),
        ("Vaud (VD)", "Waadt (VD)", "Vaud (VD)", "Vaud (VD)"),
        ("Zug (ZG)", "Zug (ZG)", "Zoug (ZG)", "Zugo (ZG)"),
        ("Zurich (ZH)", "Zürich (ZH)", "Zurich (ZH)", "Zurigo (ZH)"),
        ("Other / Abroad", "Andere / Ausland", "Autre / Étranger", "Altro / Estero"),
    ]),
    # 5. Country
    (5, [
        ("Switzerland", "Schweiz", "Suisse", "Svizzera"),
        ("Germany", "Deutschland", "Allemagne", "Germania"),
        ("Italy", "Italien", "Italie", "Italia"),
        ("France", "Frankreich", "France", "Francia"),
        ("Austria", "Österreich", "Autriche", "Austria"),
        ("Portugal", "Portugal", "Portugal", "Portogallo"),
        ("Spain", "Spanien", "Espagne", "Spagna"),
        ("Turkey", "Türkei", "Turquie", "Turchia"),
        ("Albania", "Albanien", "Albanie", "Albania"),
        ("Kosovo", "Kosovo", "Kosovo", "Kosovo"),
        ("Serbia", "Serbien", "Serbie", "Serbia"),
        ("Bosnia and Herzegovina", "Bosnien und Herzegowina", "Bosnie-Herzégovine", "Bosnia ed Erzegovina"),
        ("North Macedonia", "Nordmazedonien", "Macédoine du Nord", "Macedonia del Nord"),
        ("Croatia", "Kroatien", "Croatie", "Croazia"),
        ("Bulgaria", "Bulgarien", "Bulgarie", "Bulgaria"),
        ("Romania", "Rumänien", "Roumanie", "Romania"),
        ("Russia", "Russland", "Russie", "Russia"),
        ("Ukraine", "Ukraine", "Ukraine", "Ucraina"),
        ("Syria", "Syrien", "Syrie", "Siria"),
        ("Iraq", "Irak", "Irak", "Iraq"),
        ("Iran", "Iran", "Iran", "Iran"),
        ("Afghanistan", "Afghanistan", "Afghanistan", "Afghanistan"),
        ("Pakistan", "Pakistan", "Pakistan", "Pakistan"),
        ("India", "Indien", "Inde", "India"),
        ("Sri Lanka", "Sri Lanka", "Sri Lanka", "Sri Lanka"),
        ("Bangladesh", "Bangladesch", "Bangladesh", "Bangladesh"),
        ("Lebanon", "Libanon", "Liban", "Libano"),
        ("Saudi Arabia", "Saudi-Arabien", "Arabie saoudite", "Arabia Saudita"),
        ("Yemen", "Jemen", "Yémen", "Yemen"),
        ("Egypt", "Ägypten", "Égypte", "Egitto"),
        ("Morocco", "Marokko", "Maroc", "Marocco"),
        ("Tunisia", "Tunesien", "Tunisie", "Tunisia"),
        ("Algeria", "Algerien", "Algérie", "Algeria"),
        ("Eritrea", "Eritrea", "Érythrée", "Eritrea"),
        ("Somalia", "Somalia", "Somalie", "Somalia"),
        ("Ethiopia", "Äthiopien", "Éthiopie", "Etiopia"),
        ("Sudan", "Sudan", "Soudan", "Sudan"),
        ("Nigeria", "Nigeria", "Nigéria", "Nigeria"),
        ("China", "China", "Chine", "Cina"),
        ("Philippines", "Philippinen", "Philippines", "Filippine"),
        ("Thailand", "Thailand", "Thaïlande", "Thailandia"),
        ("Vietnam", "Vietnam", "Vietnam", "Vietnam"),
        ("Brazil", "Brasilien", "Brésil", "Brasile"),
        ("USA", "USA", "États-Unis", "Stati Uniti"),
        ("Other", "Andere", "Autre", "Altro"),
        ("Stateless", "Staatenlos", "Apatride", "Apolide"),
        ("Unknown", "Unbekannt", "Inconnu", "Sconosciuto"),
    ]),
    # 6. Civil status
    (6, [
        ("Single", "Ledig", "Célibataire", "Celibe/Nubile"),
        ("Married", "Verheiratet", "Marié(e)", "Sposato/a"),
        ("Religiously married only", "Nur religiös verheiratet", "Marié(e) religieusement uniquement", "Sposato/a solo religiosamente"),
        ("Registered partnership", "Eingetragene Partnerschaft", "Partenariat enregistré", "Unione civile"),
        ("Separated", "Getrennt", "Séparé(e)", "Separato/a"),
        ("Divorced", "Geschieden", "Divorcé(e)", "Divorziato/a"),
        ("Widowed", "Verwitwet", "Veuf/Veuve", "Vedovo/a"),
        ("Engaged", "Verlobt", "Fiancé(e)", "Fidanzato/a"),
        ("Unknown", "Unbekannt", "Inconnu", "Sconosciuto"),
    ]),
    # 7. Gender
    (7, [
        ("Female", "Weiblich", "Féminin", "Femminile"),
        ("Male", "Männlich", "Masculin", "Maschile"),
        ("Non-binary", "Nicht-binär", "Non binaire", "Non binario"),
        ("Other", "Andere", "Autre", "Altro"),
        ("Prefer not to say", "Keine Angabe", "Ne souhaite pas répondre", "Preferisco non rispondere"),
    ]),
    # 8. Residency status Switzerland
    (8, [
        ("Swiss citizen", "Schweizer Bürger/in", "Citoyen(ne) suisse", "Cittadino/a svizzero/a"),
        ("Permit C (settlement)", "Bewilligung C (Niederlassung)", "Permis C (établissement)", "Permesso C (domicilio)"),
        ("Permit B (residence)", "Bewilligung B (Aufenthalt)", "Permis B (séjour)", "Permesso B (dimora)"),
        ("Permit L (short-term)", "Bewilligung L (Kurzaufenthalt)", "Permis L (courte durée)", "Permesso L (breve durata)"),
        ("Permit F (provisionally admitted)", "Bewilligung F (vorläufig aufgenommen)", "Permis F (admis(e) provisoirement)", "Permesso F (ammesso/a provvisoriamente)"),
        ("Permit N (asylum seeker)", "Bewilligung N (Asylsuchende/r)", "Permis N (requérant(e) d'asile)", "Permesso N (richiedente asilo)"),
        ("Permit S (protection)", "Bewilligung S (Schutzstatus)", "Permis S (statut de protection)", "Permesso S (statuto di protezione)"),
        ("Permit Ci (family of diplomat)", "Bewilligung Ci (Diplomatenangehörige/r)", "Permis Ci (famille de diplomate)", "Permesso Ci (famiglia di diplomatico)"),
        ("Tourist visa", "Touristenvisum", "Visa touristique", "Visto turistico"),
        ("No legal status", "Kein Aufenthaltsstatus", "Sans statut légal", "Senza status legale"),
        ("Unknown", "Unbekannt", "Inconnu", "Sconosciuto"),
    ]),
    # 9. Ethnicity
    (9, [
        ("European", "Europäisch", "Européen(ne)", "Europeo/a"),
        ("Middle Eastern / Arab", "Nahöstlich / Arabisch", "Moyen-Oriental(e) / Arabe", "Mediorientale / Arabo/a"),
        ("Kurdish", "Kurdisch", "Kurde", "Curdo/a"),
        ("Turkish", "Türkisch", "Turc(que)", "Turco/a"),
        ("Albanian", "Albanisch", "Albanais(e)", "Albanese"),
        ("Roma / Sinti", "Roma / Sinti", "Roms / Sintis", "Rom / Sinti"),
        ("South Asian", "Südasiatisch", "Sud-asiatique", "Sud-asiatico/a"),
        ("East Asian", "Ostasiatisch", "Est-asiatique", "Est-asiatico/a"),
        ("Sub-Saharan African", "Subsahara-afrikanisch", "Afrique subsaharienne", "Africa subsahariana"),
        ("North African", "Nordafrikanisch", "Nord-africain(e)", "Nord-africano/a"),
        ("Latin American", "Lateinamerikanisch", "Latino-américain(e)", "Latino-americano/a"),
        ("Mixed", "Gemischt", "Mixte", "Misto/a"),
        ("Other", "Andere", "Autre", "Altro/a"),
        ("Prefer not to say", "Keine Angabe", "Ne souhaite pas répondre", "Preferisco non rispondere"),
    ]),
    # 10. Religion
    (10, [
        ("Christian – Catholic", "Christlich – Katholisch", "Chrétien(ne) – Catholique", "Cristiano/a – Cattolico/a"),
        ("Christian – Protestant", "Christlich – Reformiert", "Chrétien(ne) – Protestant(e)", "Cristiano/a – Protestante"),
        ("Christian – Orthodox", "Christlich – Orthodox", "Chrétien(ne) – Orthodoxe", "Cristiano/a – Ortodosso/a"),
        ("Christian – Other", "Christlich – Andere", "Chrétien(ne) – Autre", "Cristiano/a – Altro"),
        ("Muslim – Sunni", "Muslimisch – Sunnitisch", "Musulman(e) – Sunnite", "Musulmano/a – Sunnita"),
        ("Muslim – Shia", "Muslimisch – Schiitisch", "Musulman(e) – Chiite", "Musulmano/a – Sciita"),
        ("Muslim – Alevi", "Muslimisch – Alevitisch", "Musulman(e) – Alévite", "Musulmano/a – Alevita"),
        ("Muslim – Other", "Muslimisch – Andere", "Musulman(e) – Autre", "Musulmano/a – Altro"),
        ("Jewish", "Jüdisch", "Juif/Juive", "Ebraico/a"),
        ("Hindu", "Hinduistisch", "Hindou(e)", "Indù"),
        ("Buddhist", "Buddhistisch", "Bouddhiste", "Buddista"),
        ("Sikh", "Sikh", "Sikh", "Sikh"),
        ("Yazidi", "Jesidisch", "Yézidi(e)", "Yazida"),
        ("None / Atheist", "Keine / Atheistisch", "Aucune / Athée", "Nessuna / Ateo/a"),
        ("Other", "Andere", "Autre", "Altro"),
        ("Prefer not to say", "Keine Angabe", "Ne souhaite pas répondre", "Preferisco non rispondere"),
    ]),
    # 11. Instability
    (11, [
        ("None observed", "Keine festgestellt", "Aucune observée", "Nessuna osservata"),
        ("Low", "Gering", "Faible", "Bassa"),
        ("Moderate", "Mässig", "Modérée", "Moderata"),
        ("High", "Hoch", "Élevée", "Alta"),
        ("Very high", "Sehr hoch", "Très élevée", "Molto alta"),
        ("Diagnosed mental condition", "Diagnostizierte psychische Erkrankung", "Pathologie mentale diagnostiquée", "Patologia mentale diagnosticata"),
        ("Substance abuse", "Substanzmissbrauch", "Toxicomanie", "Abuso di sostanze"),
        ("Self-harm risk", "Selbstverletzungsrisiko", "Risque d'automutilation", "Rischio di autolesionismo"),
        ("Suicidal ideation", "Suizidgedanken", "Idées suicidaires", "Ideazione suicidaria"),
    ]),
    # 12. Risk
    (12, [
        ("None", "Keine", "Aucun", "Nessuno"),
        ("Low", "Gering", "Faible", "Basso"),
        ("Moderate", "Mässig", "Modéré", "Moderato"),
        ("High", "Hoch", "Élevé", "Alto"),
        ("Critical / Acute", "Kritisch / Akut", "Critique / Aigu", "Critico / Acuto"),
        ("Threat of forced marriage", "Drohende Zwangsheirat", "Menace de mariage forcé", "Minaccia di matrimonio forzato"),
        ("Threat of abduction abroad", "Drohende Verschleppung ins Ausland", "Risque d'enlèvement à l'étranger", "Rischio di rapimento all'estero"),
        ("Threat of violence", "Gewaltbedrohung", "Menace de violence", "Minaccia di violenza"),
        ("Threat of honour-based violence", "Drohung ehrenbezogener Gewalt", "Menace de violence liée à l'honneur", "Minaccia di violenza d'onore"),
    ]),
    # 13. Complex case
    (13, [
        ("Yes", "Ja", "Oui", "Sì"),
        ("No", "Nein", "Non", "No"),
        ("Partially", "Teilweise", "Partiellement", "Parzialmente"),
        ("To be assessed", "Noch zu beurteilen", "À évaluer", "Da valutare"),
    ]),
]


class Command(BaseCommand):
    help = "Seeds dropdown options (Civil status, Gender, Status, etc.) in 4 languages."

    @transaction.atomic
    def handle(self, *args, **options):
        total_created = 0
        total_skipped = 0
        for dropdown_id, options_list in SEED_DATA:
            try:
                dropdown = Dropdown.objects.get(pk=dropdown_id)
            except Dropdown.DoesNotExist:
                self.stdout.write(self.style.WARNING(
                    f"Skipping dropdown id={dropdown_id} — Dropdown row missing. "
                    f"Run loaddata for dropdown_initial_data.json first."
                ))
                continue

            created_in_this = 0
            skipped_in_this = 0
            for en, de, fr, it in options_list:
                obj, created = DropdownField.objects.get_or_create(
                    dropdownMenuId=dropdown,
                    nameEn=en,
                    defaults={
                        "nameDe": de,
                        "nameFr": fr,
                        "nameIt": it,
                        "parentFieldId": None,
                    },
                )
                if created:
                    created_in_this += 1
                    total_created += 1
                else:
                    skipped_in_this += 1
                    total_skipped += 1

            self.stdout.write(
                f"  • {dropdown.nameEn}: +{created_in_this} created, {skipped_in_this} already existed"
            )

        self.stdout.write(self.style.SUCCESS(
            f"\nDone! Created {total_created} new options. Skipped {total_skipped} that already existed."
        ))
