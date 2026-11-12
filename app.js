// 報修登記：送出表單並顯示最近 20 筆。
// 資料表的權限與檢查規則見 supabase/schema.sql。
(function () {
  "use strict";

  var TABLE = "repair_requests";
  var LIST_LIMIT = 20;
  var CATEGORIES = ["設備", "網路", "環境", "其他"];
  var URGENCIES = ["低", "中", "高"];
  var LIMITS = { reporter_name: 50, location: 100, description: 1000 };

  var form = document.getElementById("repair-form");
  var submitButton = document.getElementById("submit-button");
  var formMessage = document.getElementById("form-message");
  var listMessage = document.getElementById("list-message");
  var list = document.getElementById("repair-list");
  var refreshButton = document.getElementById("refresh-button");
  var description = document.getElementById("description");
  var descriptionCount = document.getElementById("description-count");

  function showMessage(el, type, text) {
    el.className = "message " + type;
    el.textContent = text;
    el.hidden = false;
  }

  function hideMessage(el) {
    el.hidden = true;
    el.textContent = "";
  }

  var config = window.APP_CONFIG || {};
  if (!window.supabase || !config.supabaseUrl || !config.supabaseKey) {
    showMessage(formMessage, "error", "無法連線到資料庫：程式庫或設定沒有載入，請稍後重新整理頁面。");
    submitButton.disabled = true;
    refreshButton.disabled = true;
    return;
  }

  var client = window.supabase.createClient(config.supabaseUrl, config.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 讀取表單並檢查，規則與資料庫的 CHECK 相同。
  function readForm() {
    var data = new FormData(form);
    var record = {
      reporter_name: String(data.get("reporter_name") || "").trim(),
      location: String(data.get("location") || "").trim(),
      category: String(data.get("category") || ""),
      description: String(data.get("description") || "").trim(),
      urgency: String(data.get("urgency") || ""),
    };

    if (!record.reporter_name) return { error: "請填寫報修人。" };
    if (!record.location) return { error: "請填寫地點或部門。" };
    if (CATEGORIES.indexOf(record.category) === -1) return { error: "請選擇類別。" };
    if (!record.description) return { error: "請填寫問題說明。" };
    if (URGENCIES.indexOf(record.urgency) === -1) return { error: "請選擇緊急程度。" };
    for (var key in LIMITS) {
      if (record[key].length > LIMITS[key]) return { error: "內容太長，請精簡後再送出。" };
    }
    return { record: record };
  }

  function errorText(error) {
    var raw = (error && (error.message || error.details)) || "";
    if (/Failed to fetch|NetworkError|Load failed/i.test(raw)) return "網路連線失敗，請確認網路後再試一次。";
    if (error && error.code === "23514") return "資料格式不符合規定，請檢查各欄位。";
    if (error && (error.code === "42501" || error.code === "PGRST301")) return "沒有權限寫入資料，請聯絡管理員。";
    if (error && error.code === "42P01") return "找不到報修資料表，請聯絡管理員。";
    return "發生錯誤，請稍後再試。" + (raw ? "（" + raw + "）" : "");
  }

  function formatTime(value) {
    var d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("zh-TW", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  }

  function tag(text) {
    var span = document.createElement("span");
    span.className = "tag";
    span.textContent = text;
    return span;
  }

  // 一律用 textContent 放入使用者輸入的文字，避免被當成 HTML 執行。
  function renderList(rows) {
    list.textContent = "";
    if (!rows.length) {
      showMessage(listMessage, "info", "目前還沒有報修紀錄。");
      return;
    }
    hideMessage(listMessage);
    rows.forEach(function (row) {
      var li = document.createElement("li");
      li.className = "repair-item urgency-" + row.urgency;

      var meta = document.createElement("div");
      meta.className = "meta";
      meta.appendChild(tag(row.category));
      meta.appendChild(tag("緊急程度：" + row.urgency));
      meta.appendChild(tag(row.status));

      var desc = document.createElement("p");
      desc.className = "description";
      desc.textContent = row.description;

      var who = document.createElement("p");
      who.className = "who";
      who.textContent = row.reporter_name + "・" + row.location + "・" + formatTime(row.created_at);

      li.appendChild(meta);
      li.appendChild(desc);
      li.appendChild(who);
      list.appendChild(li);
    });
  }

  async function loadList() {
    refreshButton.disabled = true;
    showMessage(listMessage, "info", "載入中…");
    try {
      var result = await client
        .from(TABLE)
        .select("id, created_at, reporter_name, location, category, description, urgency, status")
        .order("created_at", { ascending: false })
        .limit(LIST_LIMIT);
      if (result.error) throw result.error;
      renderList(result.data || []);
    } catch (error) {
      list.textContent = "";
      showMessage(listMessage, "error", "清單載入失敗：" + errorText(error));
    } finally {
      refreshButton.disabled = false;
    }
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    hideMessage(formMessage);

    var parsed = readForm();
    if (parsed.error) {
      showMessage(formMessage, "error", parsed.error);
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "送出中…";
    try {
      // 不送 status、id、created_at，交給資料庫預設值。
      var result = await client.from(TABLE).insert(parsed.record);
      if (result.error) throw result.error;
      form.reset();
      updateCount();
      showMessage(formMessage, "ok", "已送出報修，謝謝！");
      loadList();
    } catch (error) {
      showMessage(formMessage, "error", "送出失敗：" + errorText(error));
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "送出報修";
    }
  });

  function updateCount() {
    descriptionCount.textContent = String(description.value.length);
  }
  description.addEventListener("input", updateCount);
  refreshButton.addEventListener("click", loadList);

  updateCount();
  loadList();
})();
