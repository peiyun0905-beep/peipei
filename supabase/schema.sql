-- =====================================================================
-- 報修登記系統：Supabase 建表 SQL
-- 資料表：public.repair_requests
--
-- 安全設計分三層：
--   1. GRANT：決定 anon 角色「能不能碰」這張表、哪些欄位。
--   2. RLS：決定 anon 能讀、能寫「哪些資料列」。
--   3. CHECK：不論誰寫入，欄位值與文字長度都必須合法。
--
-- 前端使用 Supabase 公開金鑰（anon key），因此網頁訪客的身分就是 anon。
-- 本檔只建立結構，不含任何資料。整份放在同一個交易中，任一步失敗就全部不生效。
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 建立資料表
-- id 由資料庫自動產生 uuid；created_at 由資料庫自動記錄建立時間。
-- urgency 預設「中」，status 預設「待處理」。
-- ---------------------------------------------------------------------
create table public.repair_requests (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null    default now(),
  reporter_name text        not null,
  location      text        not null,
  category      text        not null,
  description   text        not null,
  urgency       text        not null    default '中',
  status        text        not null    default '待處理',

  -- -------------------------------------------------------------------
  -- 第 3 層：CHECK 限制
  -- 選項欄位只能填固定值；文字欄位去掉前後空白後不可為空，且有長度上限，
  -- 避免空白資料或超長內容灌爆資料表。
  -- -------------------------------------------------------------------
  constraint repair_requests_category_check
    check (category in ('設備', '網路', '環境', '其他')),
  constraint repair_requests_urgency_check
    check (urgency in ('低', '中', '高')),
  constraint repair_requests_status_check
    check (status in ('待處理', '處理中', '已完成')),
  constraint repair_requests_reporter_name_length_check
    check (char_length(btrim(reporter_name)) between 1 and 50),
  constraint repair_requests_location_length_check
    check (char_length(btrim(location)) between 1 and 100),
  constraint repair_requests_description_length_check
    check (char_length(btrim(description)) between 1 and 1000)
);

comment on table  public.repair_requests               is '報修登記紀錄';
comment on column public.repair_requests.id            is '編號，自動產生';
comment on column public.repair_requests.created_at    is '登記時間，自動產生';
comment on column public.repair_requests.reporter_name is '報修人姓名（示範只用虛構姓名）';
comment on column public.repair_requests.location      is '地點或部門';
comment on column public.repair_requests.category      is '類別：設備、網路、環境、其他';
comment on column public.repair_requests.description   is '問題說明';
comment on column public.repair_requests.urgency       is '緊急程度：低、中、高，預設中';
comment on column public.repair_requests.status        is '處理狀態：待處理、處理中、已完成，預設待處理';

-- 清單依登記時間由新到舊排序時使用的索引。
create index repair_requests_created_at_idx
  on public.repair_requests (created_at desc);

-- ---------------------------------------------------------------------
-- 第 1 層：GRANT 權限
-- 先收回 anon 與 authenticated 對這張表的所有權限，確保沒有殘留的預設授權。
-- 再只給 anon：
--   * 讀取整張表（清單需要）。
--   * 新增時只能填 reporter_name、location、category、description、urgency。
--     id、created_at、status 不開放填寫，一律使用預設值，
--     因此訪客無法偽造編號、登記時間或處理狀態。
-- 不給 update、delete、truncate，也不給 authenticated 任何權限。
-- ---------------------------------------------------------------------
revoke all on table public.repair_requests from anon, authenticated;

grant usage on schema public to anon;

grant select on table public.repair_requests to anon;

grant insert (reporter_name, location, category, description, urgency)
  on table public.repair_requests to anon;

-- ---------------------------------------------------------------------
-- 第 2 層：RLS 資料列安全
-- 啟用後，沒有符合的政策就一律拒絕。
-- 只建立 select 與 insert 兩條政策；沒有 update、delete 政策，
-- 所以就算日後誤加了權限，修改與刪除仍會被擋下。
-- ---------------------------------------------------------------------
alter table public.repair_requests enable row level security;

-- 任何訪客都可以讀取全部清單。
create policy "訪客可讀取報修清單"
  on public.repair_requests
  for select
  to anon
  using (true);

-- 任何訪客都可以新增報修，但新資料的狀態只能是「待處理」。
-- （GRANT 已不讓 anon 填 status，這裡是第二道防線。）
create policy "訪客可新增待處理的報修"
  on public.repair_requests
  for insert
  to anon
  with check (status = '待處理');

commit;
