-- Widens the specialty taxonomy.
--
-- The original seed carried sixteen entries, which covered the trades but not
-- the way a patient actually searches. Someone does not look for "Médecine
-- générale" — they look for a diabétologue, a gastro, a psychiatre. Every one
-- of those returned nothing, and an empty typeahead reads as "this site does
-- not have that" rather than "that word is missing from a lookup table".
--
-- `kinds` stays honest about who may claim each entry, so the establishment
-- form never offers "Néphrologie" to a parapharmacie. Synonyms carry the
-- spoken short form ("gastro", "diabéto"), the practitioner noun that people
-- type instead of the field ("cardiologue" for "Cardiologie"), and the Arabic
-- label where it is the one in common use.
--
-- Keyed on slug with `do nothing`, so this is re-runnable and never disturbs a
-- row an administrator has since edited.

insert into public.specialties (slug, label, synonyms, kinds, sort_order) values

  -- ─── Medicine ──────────────────────────────────────────────────────────────
  ('medecine-interne',      'Médecine interne',       array['interniste','الطب الباطني'],                       array['medecin','clinique','hopital']::public.provider_kind[], 170),
  ('diabetologie',          'Diabétologie',           array['diabetologue','diabeto','diabete','السكري'],       array['medecin','clinique','hopital']::public.provider_kind[], 180),
  ('endocrinologie',        'Endocrinologie',         array['endocrinologue','endocrino','hormones','الغدد'],   array['medecin','clinique','hopital']::public.provider_kind[], 190),
  ('gastro-enterologie',    'Gastro-entérologie',     array['gastro','gastroenterologue','estomac','الجهاز الهضمي'], array['medecin','clinique','hopital']::public.provider_kind[], 200),
  ('hepatologie',           'Hépatologie',            array['hepatologue','foie','الكبد'],                      array['medecin','clinique','hopital']::public.provider_kind[], 210),
  ('pneumologie',           'Pneumologie',            array['pneumologue','poumon','respiratoire','الصدر'],     array['medecin','clinique','hopital']::public.provider_kind[], 220),
  ('nephrologie',           'Néphrologie',            array['nephrologue','rein','dialyse','الكلى'],            array['medecin','clinique','hopital']::public.provider_kind[], 230),
  ('urologie',              'Urologie',               array['urologue','المسالك البولية'],                       array['medecin','clinique','hopital']::public.provider_kind[], 240),
  ('neurologie',            'Neurologie',             array['neurologue','neuro','الأعصاب'],                    array['medecin','clinique','hopital']::public.provider_kind[], 250),
  ('rhumatologie',          'Rhumatologie',           array['rhumatologue','rhumato','articulations','المفاصل'], array['medecin','clinique','hopital']::public.provider_kind[], 260),
  ('hematologie',           'Hématologie',            array['hematologue','sang','الدم'],                       array['medecin','clinique','hopital']::public.provider_kind[], 270),
  ('oncologie',             'Oncologie',              array['oncologue','cancerologie','cancer','الأورام'],     array['medecin','clinique','hopital']::public.provider_kind[], 280),
  ('infectiologie',         'Infectiologie',          array['infectiologue','maladies infectieuses'],           array['medecin','clinique','hopital']::public.provider_kind[], 290),
  ('allergologie',          'Allergologie',           array['allergologue','allergie','الحساسية'],              array['medecin','clinique','hopital']::public.provider_kind[], 300),
  ('geriatrie',             'Gériatrie',              array['geriatre','personnes agees','الشيخوخة'],           array['medecin','clinique','hopital']::public.provider_kind[], 310),
  ('angiologie',            'Angiologie',             array['angiologue','phlebologie','varices','veines'],     array['medecin','clinique','hopital']::public.provider_kind[], 320),

  -- ─── Mental health ─────────────────────────────────────────────────────────
  ('psychiatrie',           'Psychiatrie',            array['psychiatre','الطب النفسي'],                        array['medecin','clinique','hopital']::public.provider_kind[], 330),
  ('pedopsychiatrie',       'Pédopsychiatrie',        array['pedopsychiatre','psychiatrie infantile'],          array['medecin','clinique','hopital']::public.provider_kind[], 340),
  ('psychologie',           'Psychologie',            array['psychologue','psy','علم النفس'],                   array['medecin','clinique']::public.provider_kind[], 350),

  -- ─── Surgery ───────────────────────────────────────────────────────────────
  ('chirurgie-generale',    'Chirurgie générale',     array['chirurgien','الجراحة العامة'],                      array['medecin','clinique','hopital']::public.provider_kind[], 360),
  ('chirurgie-orthopedique','Chirurgie orthopédique', array['orthopediste','orthopedie','os','العظام'],         array['medecin','clinique','hopital']::public.provider_kind[], 370),
  ('neurochirurgie',        'Neurochirurgie',         array['neurochirurgien','جراحة المخ'],                    array['medecin','clinique','hopital']::public.provider_kind[], 380),
  ('chirurgie-pediatrique', 'Chirurgie pédiatrique',  array['chirurgien pediatre'],                             array['medecin','clinique','hopital']::public.provider_kind[], 390),
  ('chirurgie-vasculaire',  'Chirurgie vasculaire',   array['chirurgien vasculaire','vaisseaux'],               array['medecin','clinique','hopital']::public.provider_kind[], 400),
  ('chirurgie-thoracique',  'Chirurgie thoracique',   array['chirurgien thoracique'],                           array['medecin','clinique','hopital']::public.provider_kind[], 410),
  ('chirurgie-cardiaque',   'Chirurgie cardiaque',    array['chirurgie cardiovasculaire','coeur'],              array['medecin','clinique','hopital']::public.provider_kind[], 420),
  ('chirurgie-maxillo',     'Chirurgie maxillo-faciale', array['maxillo','machoire'],                           array['medecin','clinique','hopital','dentiste']::public.provider_kind[], 430),
  ('chirurgie-plastique',   'Chirurgie plastique',    array['esthetique','plastique','التجميل'],                array['medecin','clinique','hopital']::public.provider_kind[], 440),
  ('anesthesie-reanimation','Anesthésie-réanimation', array['anesthesiste','reanimation','التخدير'],            array['medecin','clinique','hopital']::public.provider_kind[], 450),

  -- ─── Dental & sensory ──────────────────────────────────────────────────────
  ('orthodontie',           'Orthodontie',            array['orthodontiste','appareil dentaire','تقويم الأسنان'], array['dentiste','clinique']::public.provider_kind[], 460),
  ('parodontologie',        'Parodontologie',         array['parodontiste','gencives'],                         array['dentiste','clinique']::public.provider_kind[], 470),
  ('implantologie',         'Implantologie dentaire', array['implant dentaire','implantologue'],                array['dentiste','clinique']::public.provider_kind[], 480),
  ('orthophonie',           'Orthophonie',            array['orthophoniste','langage','تقويم النطق'],           array['medecin','clinique']::public.provider_kind[], 490),
  ('audiologie',            'Audiologie',             array['audioprothesiste','audition','surdite'],           array['medecin','clinique','opticien']::public.provider_kind[], 500),

  -- ─── Other practitioners ───────────────────────────────────────────────────
  ('nutrition',             'Nutrition et diététique', array['nutritionniste','dieteticien','regime','التغذية'], array['medecin','clinique']::public.provider_kind[], 510),
  ('medecine-du-sport',     'Médecine du sport',      array['medecin du sport','traumatologie du sport'],       array['medecin','clinique']::public.provider_kind[], 520),
  ('medecine-du-travail',   'Médecine du travail',    array['medecin du travail'],                              array['medecin','clinique','hopital']::public.provider_kind[], 530),
  ('medecine-esthetique',   'Médecine esthétique',    array['esthetique','botox','comblement'],                 array['medecin','clinique']::public.provider_kind[], 540),
  ('podologie',             'Podologie',              array['podologue','pied','pedicure'],                     array['medecin','clinique']::public.provider_kind[], 550),
  ('osteopathie',           'Ostéopathie',            array['osteopathe','manipulation'],                       array['medecin','kinesitherapie','clinique']::public.provider_kind[], 560),
  ('reeducation',           'Médecine physique et réadaptation', array['reeducation','readaptation','physiatre'], array['medecin','kinesitherapie','clinique','hopital']::public.provider_kind[], 570),

  -- ─── Diagnostics ───────────────────────────────────────────────────────────
  ('echographie',           'Échographie',            array['echo','echographie','سونار'],                      array['imagerie','medecin','clinique','hopital']::public.provider_kind[], 580),
  ('mammographie',          'Mammographie',           array['mammo','sein'],                                    array['imagerie','clinique','hopital']::public.provider_kind[], 590),
  ('medecine-nucleaire',    'Médecine nucléaire',     array['scintigraphie'],                                   array['imagerie','clinique','hopital']::public.provider_kind[], 600),
  ('anatomie-pathologique', 'Anatomie pathologique',  array['anapath','biopsie'],                               array['laboratoire','clinique','hopital']::public.provider_kind[], 610),
  ('genetique-medicale',    'Génétique médicale',     array['genetique','caryotype'],                           array['laboratoire','clinique','hopital']::public.provider_kind[], 620)

on conflict (slug) do nothing;
