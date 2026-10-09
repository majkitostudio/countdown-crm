-- ============================================================================
-- COUNTDOWN CRM - AUTHENTICATED WORKSPACE CATALOG SEED
-- Generated automatically from data/seeds/catalog-seed-template.json
-- Target Workspace: 00000000-0000-0000-0000-000000000001
-- ============================================================================

DO $$
DECLARE
  v_org_id UUID;
  v_ws_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
  v_admin_id UUID;
BEGIN
  -- 1. Ensure Organization exists
  INSERT INTO public.organizations (name, slug)
  VALUES ('Countdown Telemarketing', 'countdown')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_org_id;

  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id FROM public.organizations WHERE slug = 'countdown';
  END IF;

  -- 2. Ensure Target Workspace exists
  INSERT INTO public.workspaces (id, organization_id, name, slug)
  VALUES (v_ws_id, v_org_id, 'Hlavní linka CC', 'main')
  ON CONFLICT (organization_id, slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_ws_id;

  -- Catalog scripts require a real, already-authorized workspace administrator.
  SELECT user_id INTO v_admin_id
  FROM public.workspace_members
  WHERE workspace_id = v_ws_id AND role = 'administrator'
  ORDER BY created_at
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Catalog seed requires an existing workspace administrator created through Supabase Auth.';
  END IF;

  -- 6. Seed Catalog Products
  INSERT INTO public.products (id, workspace_id, title, category, price, currency, description, image_url, in_stock)
  VALUES (
    '11111111-0000-0000-0000-000000000001'::UUID,
    v_ws_id,
    'ArthroFlex Active Forte',
    'supplements',
    1199,
    'CZK',
    'Prémiový třísložkový kloubní komplex s glukosaminem, MSM a rybím kolagenem typu II. Určeno pro regeneraci chrupavek, ranní hybnost a úlevu při zátěži.',
    '/images/products/arthroflex.png',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    workspace_id = EXCLUDED.workspace_id,
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    price = EXCLUDED.price,
    currency = EXCLUDED.currency,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    in_stock = EXCLUDED.in_stock;

  INSERT INTO public.products (id, workspace_id, title, category, price, currency, description, image_url, in_stock)
  VALUES (
    '11111111-0000-0000-0000-000000000002'::UUID,
    v_ws_id,
    'CardioVital Max (Omega-3 & Q10)',
    'supplements',
    999,
    'CZK',
    'Vysoce koncentrovaný rybí olej s vysokým podílem EPA a DHA mastných kyselin obohacený o koenzym Q10 a vitamín E pro zdravé srdce, cévy a normální krevní tlak.',
    '/images/products/cardiovital.png',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    workspace_id = EXCLUDED.workspace_id,
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    price = EXCLUDED.price,
    currency = EXCLUDED.currency,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    in_stock = EXCLUDED.in_stock;

  INSERT INTO public.products (id, workspace_id, title, category, price, currency, description, image_url, in_stock)
  VALUES (
    '11111111-0000-0000-0000-000000000003'::UUID,
    v_ws_id,
    'Magnesium Bisglycinát + B6',
    'supplements',
    890,
    'CZK',
    'Prémiová chelátová forma hořčíku s maximální vstřebatelností (až 80 %) v kombinaci s aktivním vitamínem B6. Podporuje nervovou soustavu, hluboký spánek a svalové uvolnění bez projímavých účinků.',
    '/images/products/magnesium.png',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    workspace_id = EXCLUDED.workspace_id,
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    price = EXCLUDED.price,
    currency = EXCLUDED.currency,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    in_stock = EXCLUDED.in_stock;

  -- 7. Seed Product Scripts and Published Versions
  -- Script for: ArthroFlex Active Forte
  INSERT INTO public.product_scripts (workspace_id, product_id, content_html, updated_by, updated_at)
  VALUES (
    v_ws_id,
    '11111111-0000-0000-0000-000000000001'::UUID,
    '<p><strong>1. První pozitivní dojem:</strong></p><p>Dobrý den, pane/paní, volám ze zákaznického centra Countdown ohledně Vašeho zájmu o podporu kloubů a hybnosti. Než se podíváme na samotný doplněk, smím se zeptat, jaké potíže Vás v poslední době nejvíce omezují?</p><p><strong>2. Zjištění potřeb:</strong></p><p>Trápí Vás spíše ranní ztuhlost nebo ostrá bolest při chůzi do schodů a delším stání?</p><p>Jak dlouho již tyto obtíže pociťujete a zkoušel(a) jste již nějaké masti nebo doplňky z lékárny?</p><p>Co je pro Vás při výběru nejdůležitější – rychlost nástupu úlevy, nebo čisté přírodní složení bez chemie?</p><p><strong>3. Představení řešení a schválené benefity:</strong></p><p>Synergické složení s vysokou biologickou dostupností – kombinace glukosamin sulfátu a hydrolyzovaného kolagenu typu II vyživuje chrupavku zevnitř.</p><p>Jednoduché dávkování – pouze 2 kapsle denně ráno k jídlu bez podráždění žaludku.</p><p>Doporučená délka kúry je 3 až 4 měsíce pro dlouhodobou obnovu kloubního pouzdra a synoviální tekutiny.</p><p><strong>4. Cenová nabídka &amp; balíčky:</strong></p><p>Běžná katalogová cena na e-shopu je 1 399 Kč. Dnes Vám v rámci telefonické akce nabízím balení za 1 199 Kč. Při volbě plné 3–4měsíční kúry cena klesá na 999 Kč za balení a navíc přidáváme 2 odborné e-knihy o pohybovém aparátu a dopravu zdarma.</p><p><strong>5. Závěrečný pozitivní dojem a potvrzení:</strong></p><p>Pokud s touto péčí souhlasíte, balíček Vám odešleme ještě dnes na dobírku. Žádné placení předem, zaplatíte až při převzetí u kurýra. Můžeme potvrdit Vaši doručovací adresu?</p><p><strong>Pravidla a mantinely (Guardrails):</strong></p><p><strong>Script guidance:</strong> Nikdy neslibovat lékařské uzdravení, vymizení těžké artrózy 4. stupně ani okamžitý účinek do 24 hodin.</p><p><strong>Script guidance:</strong> Nezamlčovat podmínky dopravy a platby na dobírku.</p><p><strong>Script guidance:</strong> Neprezentovat se jako ošetřující lékař, ale jako odborný specialista zákaznické linky.</p>',
    v_admin_id,
    now()
  )
  ON CONFLICT (workspace_id, product_id) DO UPDATE SET
    content_html = EXCLUDED.content_html,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();

  INSERT INTO public.product_script_versions (workspace_id, product_id, version_number, status, content_html, created_by, published_by, created_at, published_at)
  VALUES (
    v_ws_id,
    '11111111-0000-0000-0000-000000000001'::UUID,
    1,
    'published',
    '<p><strong>1. První pozitivní dojem:</strong></p><p>Dobrý den, pane/paní, volám ze zákaznického centra Countdown ohledně Vašeho zájmu o podporu kloubů a hybnosti. Než se podíváme na samotný doplněk, smím se zeptat, jaké potíže Vás v poslední době nejvíce omezují?</p><p><strong>2. Zjištění potřeb:</strong></p><p>Trápí Vás spíše ranní ztuhlost nebo ostrá bolest při chůzi do schodů a delším stání?</p><p>Jak dlouho již tyto obtíže pociťujete a zkoušel(a) jste již nějaké masti nebo doplňky z lékárny?</p><p>Co je pro Vás při výběru nejdůležitější – rychlost nástupu úlevy, nebo čisté přírodní složení bez chemie?</p><p><strong>3. Představení řešení a schválené benefity:</strong></p><p>Synergické složení s vysokou biologickou dostupností – kombinace glukosamin sulfátu a hydrolyzovaného kolagenu typu II vyživuje chrupavku zevnitř.</p><p>Jednoduché dávkování – pouze 2 kapsle denně ráno k jídlu bez podráždění žaludku.</p><p>Doporučená délka kúry je 3 až 4 měsíce pro dlouhodobou obnovu kloubního pouzdra a synoviální tekutiny.</p><p><strong>4. Cenová nabídka &amp; balíčky:</strong></p><p>Běžná katalogová cena na e-shopu je 1 399 Kč. Dnes Vám v rámci telefonické akce nabízím balení za 1 199 Kč. Při volbě plné 3–4měsíční kúry cena klesá na 999 Kč za balení a navíc přidáváme 2 odborné e-knihy o pohybovém aparátu a dopravu zdarma.</p><p><strong>5. Závěrečný pozitivní dojem a potvrzení:</strong></p><p>Pokud s touto péčí souhlasíte, balíček Vám odešleme ještě dnes na dobírku. Žádné placení předem, zaplatíte až při převzetí u kurýra. Můžeme potvrdit Vaši doručovací adresu?</p><p><strong>Pravidla a mantinely (Guardrails):</strong></p><p><strong>Script guidance:</strong> Nikdy neslibovat lékařské uzdravení, vymizení těžké artrózy 4. stupně ani okamžitý účinek do 24 hodin.</p><p><strong>Script guidance:</strong> Nezamlčovat podmínky dopravy a platby na dobírku.</p><p><strong>Script guidance:</strong> Neprezentovat se jako ošetřující lékař, ale jako odborný specialista zákaznické linky.</p>',
    v_admin_id,
    v_admin_id,
    now(),
    now()
  )
  ON CONFLICT (workspace_id, product_id, version_number) DO UPDATE SET
    status = 'published',
    content_html = EXCLUDED.content_html,
    published_by = EXCLUDED.published_by,
    published_at = now();

  -- Script for: CardioVital Max (Omega-3 & Q10)
  INSERT INTO public.product_scripts (workspace_id, product_id, content_html, updated_by, updated_at)
  VALUES (
    v_ws_id,
    '11111111-0000-0000-0000-000000000002'::UUID,
    '<p><strong>1. První pozitivní dojem:</strong></p><p>Dobrý den, pane/paní, volám ze zákaznického servisu ohledně Vašeho zájmu o podporu kardiovaskulárního systému a zdraví cév. Mohu se zeptat, co Vás vedlo k zájmu o tento doplněk?</p><p><strong>2. Zjištění potřeb:</strong></p><p>Řešíte v rodině spíše podporu krevního tlaku a cévní pružnosti, nebo celkovou únavu a vitalitu?</p><p>Konzumujete pravidelně mořské ryby alespoň 2–3x týdně, nebo hledáte spolehlivý zdroj kvalitních Omega-3?</p><p>Hledáte kapsle bez nepříjemné rybí pachuti v ústech?</p><p><strong>3. Představení řešení a schválené benefity:</strong></p><p>Garantovaná čistota – molekulárně destilovaný olej z divoce žijících ryb bez těžkých kovů a mikroplastů.</p><p>Silný synergický efekt – spojení Omega-3 s koenzymem Q10 přímo zásobuje srdeční sval buněčnou energií.</p><p>Enterosolventní kapsle – vstřebávají se až ve střevech, takže nezpůsobují žádný nepříjemný rybí zápach.</p><p><strong>4. Cenová nabídka &amp; balíčky:</strong></p><p>Běžná prodejní cena v lékárnách je 1 199 Kč. Pro Vás máme dnes akční telefonickou cenu 999 Kč. U rodinného balení 3 kusů nabízíme cenu 799 Kč za kus s dopravou zdarma.</p><p><strong>5. Závěrečný pozitivní dojem a potvrzení:</strong></p><p>Balíček Vám odešleme kurýrem na dobírku, zaplatíte až při bezpečném předání. Mohu poprosit o kontrolu Vašeho PSČ a adresy?</p><p><strong>Pravidla a mantinely (Guardrails):</strong></p><p><strong>Script guidance:</strong> Nikdy neslibovat vysazení léků na tlak nebo léků na ředění krve (Warfarin apod.).</p><p><strong>Script guidance:</strong> Doporučit konzultaci s ošetřujícím lékařem při současném užívání silných antikoagulancií.</p><p><strong>Script guidance:</strong> Uvádět pouze schválená zdravotní tvrzení dle EFSA (příznivý vliv EPA a DHA na normální činnost srdce).</p>',
    v_admin_id,
    now()
  )
  ON CONFLICT (workspace_id, product_id) DO UPDATE SET
    content_html = EXCLUDED.content_html,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();

  INSERT INTO public.product_script_versions (workspace_id, product_id, version_number, status, content_html, created_by, published_by, created_at, published_at)
  VALUES (
    v_ws_id,
    '11111111-0000-0000-0000-000000000002'::UUID,
    1,
    'published',
    '<p><strong>1. První pozitivní dojem:</strong></p><p>Dobrý den, pane/paní, volám ze zákaznického servisu ohledně Vašeho zájmu o podporu kardiovaskulárního systému a zdraví cév. Mohu se zeptat, co Vás vedlo k zájmu o tento doplněk?</p><p><strong>2. Zjištění potřeb:</strong></p><p>Řešíte v rodině spíše podporu krevního tlaku a cévní pružnosti, nebo celkovou únavu a vitalitu?</p><p>Konzumujete pravidelně mořské ryby alespoň 2–3x týdně, nebo hledáte spolehlivý zdroj kvalitních Omega-3?</p><p>Hledáte kapsle bez nepříjemné rybí pachuti v ústech?</p><p><strong>3. Představení řešení a schválené benefity:</strong></p><p>Garantovaná čistota – molekulárně destilovaný olej z divoce žijících ryb bez těžkých kovů a mikroplastů.</p><p>Silný synergický efekt – spojení Omega-3 s koenzymem Q10 přímo zásobuje srdeční sval buněčnou energií.</p><p>Enterosolventní kapsle – vstřebávají se až ve střevech, takže nezpůsobují žádný nepříjemný rybí zápach.</p><p><strong>4. Cenová nabídka &amp; balíčky:</strong></p><p>Běžná prodejní cena v lékárnách je 1 199 Kč. Pro Vás máme dnes akční telefonickou cenu 999 Kč. U rodinného balení 3 kusů nabízíme cenu 799 Kč za kus s dopravou zdarma.</p><p><strong>5. Závěrečný pozitivní dojem a potvrzení:</strong></p><p>Balíček Vám odešleme kurýrem na dobírku, zaplatíte až při bezpečném předání. Mohu poprosit o kontrolu Vašeho PSČ a adresy?</p><p><strong>Pravidla a mantinely (Guardrails):</strong></p><p><strong>Script guidance:</strong> Nikdy neslibovat vysazení léků na tlak nebo léků na ředění krve (Warfarin apod.).</p><p><strong>Script guidance:</strong> Doporučit konzultaci s ošetřujícím lékařem při současném užívání silných antikoagulancií.</p><p><strong>Script guidance:</strong> Uvádět pouze schválená zdravotní tvrzení dle EFSA (příznivý vliv EPA a DHA na normální činnost srdce).</p>',
    v_admin_id,
    v_admin_id,
    now(),
    now()
  )
  ON CONFLICT (workspace_id, product_id, version_number) DO UPDATE SET
    status = 'published',
    content_html = EXCLUDED.content_html,
    published_by = EXCLUDED.published_by,
    published_at = now();

  -- Script for: Magnesium Bisglycinát + B6
  INSERT INTO public.product_scripts (workspace_id, product_id, content_html, updated_by, updated_at)
  VALUES (
    v_ws_id,
    '11111111-0000-0000-0000-000000000003'::UUID,
    '<p><strong>1. První pozitivní dojem:</strong></p><p>Dobrý den, volám ohledně Vaší poptávky na vysoce vstřebatelný hořčík pro lepší spánek a regeneraci. Smím se zeptat, jaké příznaky nedostatku hořčíku na sobě nejvíce pozorujete?</p><p><strong>2. Zjištění potřeb:</strong></p><p>Bývají to spíše noční křeče v lýtkách, nebo neklidný přerušovaný spánek a ranní únava?</p><p>Už jste někdy užíval(a) běžný hořčík z lékárny a měl(a) po něm zažívací potíže?</p><p>Hledáte formu, která se užívá večer před spaním pro rychlé zklidnění organismu?</p><p><strong>3. Představení řešení a schválené benefity:</strong></p><p>Chelátová vazba bisglycinátu – nejlépe využitelná forma na trhu s minimálním zatížením žaludku a bez průjmů.</p><p>Rychlý nástup – díky aminokyselině glycin přirozeně navozuje klidný a hluboký spánek.</p><p>Obohaceno o aktivní vitamín B6, který pomáhá buňkám vstřebat hořčík přímo do tkání.</p><p><strong>4. Cenová nabídka &amp; balíčky:</strong></p><p>Běžná cena za 90 kapslí je 990 Kč. Dnes máme pro volající zvýhodněnou cenu 890 Kč. Při objednání balíčku na 6 měsíců je cena 690 Kč za kus včetně doručení zdarma.</p><p><strong>5. Závěrečný pozitivní dojem a potvrzení:</strong></p><p>Objednávku připravíme a pošleme ještě dnes. Platíte hotově nebo kartou kurýrovi při převzetí. Je uvedená doručovací adresa v pořádku?</p><p><strong>Pravidla a mantinely (Guardrails):</strong></p><p><strong>Script guidance:</strong> Nenahrazovat lékařskou péči při vážných neurologických onemocněních.</p><p><strong>Script guidance:</strong> Dodržovat doporučené denní dávkování 2 kapsle denně večer.</p>',
    v_admin_id,
    now()
  )
  ON CONFLICT (workspace_id, product_id) DO UPDATE SET
    content_html = EXCLUDED.content_html,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();

  INSERT INTO public.product_script_versions (workspace_id, product_id, version_number, status, content_html, created_by, published_by, created_at, published_at)
  VALUES (
    v_ws_id,
    '11111111-0000-0000-0000-000000000003'::UUID,
    1,
    'published',
    '<p><strong>1. První pozitivní dojem:</strong></p><p>Dobrý den, volám ohledně Vaší poptávky na vysoce vstřebatelný hořčík pro lepší spánek a regeneraci. Smím se zeptat, jaké příznaky nedostatku hořčíku na sobě nejvíce pozorujete?</p><p><strong>2. Zjištění potřeb:</strong></p><p>Bývají to spíše noční křeče v lýtkách, nebo neklidný přerušovaný spánek a ranní únava?</p><p>Už jste někdy užíval(a) běžný hořčík z lékárny a měl(a) po něm zažívací potíže?</p><p>Hledáte formu, která se užívá večer před spaním pro rychlé zklidnění organismu?</p><p><strong>3. Představení řešení a schválené benefity:</strong></p><p>Chelátová vazba bisglycinátu – nejlépe využitelná forma na trhu s minimálním zatížením žaludku a bez průjmů.</p><p>Rychlý nástup – díky aminokyselině glycin přirozeně navozuje klidný a hluboký spánek.</p><p>Obohaceno o aktivní vitamín B6, který pomáhá buňkám vstřebat hořčík přímo do tkání.</p><p><strong>4. Cenová nabídka &amp; balíčky:</strong></p><p>Běžná cena za 90 kapslí je 990 Kč. Dnes máme pro volající zvýhodněnou cenu 890 Kč. Při objednání balíčku na 6 měsíců je cena 690 Kč za kus včetně doručení zdarma.</p><p><strong>5. Závěrečný pozitivní dojem a potvrzení:</strong></p><p>Objednávku připravíme a pošleme ještě dnes. Platíte hotově nebo kartou kurýrovi při převzetí. Je uvedená doručovací adresa v pořádku?</p><p><strong>Pravidla a mantinely (Guardrails):</strong></p><p><strong>Script guidance:</strong> Nenahrazovat lékařskou péči při vážných neurologických onemocněních.</p><p><strong>Script guidance:</strong> Dodržovat doporučené denní dávkování 2 kapsle denně večer.</p>',
    v_admin_id,
    v_admin_id,
    now(),
    now()
  )
  ON CONFLICT (workspace_id, product_id, version_number) DO UPDATE SET
    status = 'published',
    content_html = EXCLUDED.content_html,
    published_by = EXCLUDED.published_by,
    published_at = now();

  -- 8. Seed Objections Catalog
  DELETE FROM public.objections WHERE workspace_id = v_ws_id AND product_id = '11111111-0000-0000-0000-000000000001'::UUID;
  DELETE FROM public.objections WHERE workspace_id = v_ws_id AND product_id = '11111111-0000-0000-0000-000000000002'::UUID;
  DELETE FROM public.objections WHERE workspace_id = v_ws_id AND product_id = '11111111-0000-0000-0000-000000000003'::UUID;

  INSERT INTO public.objections (workspace_id, product_id, objection_title, rebuttal_args)
  VALUES (
    v_ws_id,
    '11111111-0000-0000-0000-000000000001'::UUID,
    'Cena je příliš vysoká',
    ARRAY['Naprosto Vám rozumím. Při rozpočítání na denní dávku to však vychází na zhruba 33 Kč – což je méně než jedna běžná káva v restauraci.', 'V běžné lékárně byste musel(a) koupit 3 různé preparáty, abyste získal(a) stejnou dávku kolagenu, glukosaminu a MSM, a zaplatil(a) byste více.', 'V případě objednávky zvýhodněného balíčku máte dopravu zdarma a navíc bonusové materiály.']::text[]
  );
  INSERT INTO public.objections (workspace_id, product_id, objection_title, rebuttal_args)
  VALUES (
    v_ws_id,
    '11111111-0000-0000-0000-000000000001'::UUID,
    'Musím se nejdříve poradit s rodinou nebo lékařem',
    ARRAY['To je zcela v pořádku a rozumný přístup. Právě proto posíláme balíček na dobírku – zásilka Vám dorazí za 2 dny a do té doby si můžete v klidu projít příbalový leták i složení.', 'Složení je 100% přírodní a notifikované, takže je bezpečné i při běžných lécích na tlak.', 'Mohu Vám mezitím rezervovat dnešní zvýhodněnou cenu, abyste o akci nepřišel(a)?']::text[]
  );
  INSERT INTO public.objections (workspace_id, product_id, objection_title, rebuttal_args)
  VALUES (
    v_ws_id,
    '11111111-0000-0000-0000-000000000001'::UUID,
    'Už jsem zkoušel(a) jiné věci a nic nepomohlo',
    ARRAY['To slýcháme často od klientů, kteří zkoušeli levné produkty s minimálním obsahem aktivních látek. ArthroFlex obsahuje vstřebatelnou formu MSM a kolagenní peptidy s garantovanou čistotou.', 'U kloubů je klíčová pravidelnost – většina lidí skončí po 2 týdnech, přičemž obnova chrupavky vyžaduje 60 až 90 dní stabilního přísunu živin.']::text[]
  );
  INSERT INTO public.objections (workspace_id, product_id, objection_title, rebuttal_args)
  VALUES (
    v_ws_id,
    '11111111-0000-0000-0000-000000000002'::UUID,
    'Omega-3 si mohu koupit levněji v supermarketu',
    ARRAY['Máte pravdu, že levné oleje existují. Ty však často mívají nízký podíl účinných kyselin EPA/DHA a bývají zoxidované, což poznáte podle zápachu.', 'V jedné kapsli CardioVital získáte trojnásobnou koncentraci a navíc drahý koenzym Q10, který v běžných produktech zcela chybí.']::text[]
  );
  INSERT INTO public.objections (workspace_id, product_id, objection_title, rebuttal_args)
  VALUES (
    v_ws_id,
    '11111111-0000-0000-0000-000000000002'::UUID,
    'Bojím se, že mi bude po rybím oleji těžko',
    ARRAY['Právě proto používáme speciální enterosolventní kapsle, které se rozpouští až v tenkém střevě, nikoli v žaludku. Žádné říhání ani rybí pachuť nehrozí.']::text[]
  );
  INSERT INTO public.objections (workspace_id, product_id, objection_title, rebuttal_args)
  VALUES (
    v_ws_id,
    '11111111-0000-0000-0000-000000000003'::UUID,
    'Hořčík mi vždycky způsobil průjem',
    ARRAY['To je přesně důvod, proč lidé přecházejí na bisglycinát. Průjem způsobují levné formy jako oxid nebo citrát hořečnatý. Chelátový bisglycinát se vstřebává přes aminokyselinové kanály a žaludek vůbec nedráždí.']::text[]
  );
  INSERT INTO public.objections (workspace_id, product_id, objection_title, rebuttal_args)
  VALUES (
    v_ws_id,
    '11111111-0000-0000-0000-000000000003'::UUID,
    'Užívám jiné vitamíny, nebude se to bít?',
    ARRAY['Naopak, hořčík funguje v těle jako katalyzátor pro více než 300 biochemických reakcí a skvěle se doplňuje s vitamínem D i běžnými multivitaminy.']::text[]
  );
END $$;
