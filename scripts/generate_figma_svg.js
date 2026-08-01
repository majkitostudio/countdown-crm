const fs = require('fs');
const path = require('path');

const svgContent = `<svg width="1440" height="900" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
  <style>
    .bg { fill: #09090B; }
    .sidebar { fill: #09090B; stroke: #27272A; stroke-width: 1; }
    .header { fill: #09090B; stroke: #27272A; stroke-width: 1; }
    .card { fill: #121215; stroke: #27272A; stroke-width: 1; rx: 12; }
    .card-inner { fill: #09090B; stroke: #27272A; stroke-width: 1; rx: 8; }
    .text-main { fill: #FAFAFA; font-family: 'Poppins', sans-serif; font-weight: 600; }
    .text-sub { fill: #A1A1AA; font-family: 'Poppins', sans-serif; font-weight: 400; }
    .text-accent { fill: #10B981; font-family: 'Poppins', sans-serif; font-weight: 500; }
    .badge { fill: #18181B; stroke: #27272A; stroke-width: 1; }
    .btn-primary { fill: #FAFAFA; rx: 8; }
    .btn-primary-text { fill: #09090B; font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 13px; }
  </style>

  <!-- Background -->
  <rect width="1440" height="900" class="bg" />

  <!-- Sidebar (Left) -->
  <rect x="0" y="0" width="256" height="900" class="sidebar" />
  
  <!-- Logo Section -->
  <rect x="20" y="16" width="36" height="36" rx="8" fill="#18181B" stroke="#3F3F46" />
  <path d="M38 24L30 36H37L35 44L43 32H36L38 24Z" fill="#F59E0B" />
  <text x="68" y="34" class="text-main" font-size="15">COUNTDOWN</text>
  <text x="68" y="46" class="text-sub" font-size="10">AI CRM v0.1</text>

  <!-- Sidebar Nav Items -->
  <rect x="12" y="80" width="232" height="40" rx="8" fill="#27272A" />
  <text x="48" y="105" class="text-main" font-size="13">📊 Dashboard</text>

  <text x="48" y="153" class="text-sub" font-size="13">📞 Operator Console</text>
  <text x="48" y="201" class="text-sub" font-size="13">👥 Leads &amp; Contacts</text>
  <text x="48" y="249" class="text-sub" font-size="13">📦 Product Catalog</text>
  <text x="48" y="297" class="text-sub" font-size="13">📋 Call Logs</text>
  <text x="48" y="345" class="text-sub" font-size="13">⚙️ Settings</text>

  <!-- Operator Status Footer -->
  <rect x="12" y="830" width="232" height="50" rx="8" class="badge" />
  <circle cx="32" cy="855" r="5" fill="#10B981" />
  <text x="46" y="851" class="text-sub" font-size="10">STATUS</text>
  <text x="46" y="865" class="text-main" font-size="12">Ready for Calls</text>

  <!-- Header (Top) -->
  <rect x="256" y="0" width="1184" height="64" class="header" />
  
  <rect x="280" y="14" width="380" height="36" rx="8" fill="#18181B" stroke="#27272A" />
  <text x="310" y="37" class="text-sub" font-size="12">Search leads, products, orders... (Ctrl + K)</text>
  
  <rect x="1160" y="16" width="110" height="32" rx="16" fill="#18181B" stroke="#27272A" />
  <circle cx="1175" cy="32" r="4" fill="#10B981" />
  <text x="1185" y="36" class="text-sub" font-size="11">System Live</text>

  <rect x="1290" y="16" width="32" height="32" rx="16" fill="#27272A" />
  <text x="1300" y="37" class="text-main" font-size="12">JD</text>
  <text x="1330" y="30" class="text-main" font-size="12">John Doe</text>
  <text x="1330" y="44" class="text-sub" font-size="10">Senior Agent</text>

  <!-- Main Content Area -->
  <rect x="280" y="88" width="1136" height="80" rx="12" class="card" />
  <text x="304" y="122" class="text-main" font-size="18">Welcome back, John 👋</text>
  <text x="304" y="144" class="text-sub" font-size="12">System layout shell initialized. Ready for call center operations &amp; AI Copilot integration.</text>
  
  <rect x="1220" y="108" width="172" height="40" rx="8" class="btn-primary" />
  <text x="1236" y="133" class="btn-primary-text">📞 Operator Console</text>

  <!-- KPI Cards Row -->
  <rect x="280" y="184" width="268" height="120" rx="12" class="card" />
  <text x="304" y="214" class="text-sub" font-size="12">Total Calls Today</text>
  <text x="304" y="254" class="text-main" font-size="28">142</text>
  <text x="304" y="280" class="text-accent" font-size="11">↗ +14% vs avg</text>

  <rect x="568" y="184" width="268" height="120" rx="12" class="card" />
  <text x="592" y="214" class="text-sub" font-size="12">Conversion Rate</text>
  <text x="592" y="254" class="text-main" font-size="28">34.2%</text>
  <text x="592" y="280" class="text-accent" font-size="11">↗ +3.8% target</text>

  <rect x="856" y="184" width="268" height="120" rx="12" class="card" />
  <text x="880" y="214" class="text-sub" font-size="12">Total Revenue</text>
  <text x="880" y="254" class="text-main" font-size="28">$8,450.00</text>
  <text x="880" y="280" class="text-accent" font-size="11">↗ 12 closed deals</text>

  <rect x="1144" y="184" width="272" height="120" rx="12" class="card" />
  <text x="1168" y="214" class="text-sub" font-size="12">Active Agents</text>
  <text x="1168" y="254" class="text-main" font-size="28">8 / 10</text>
  <text x="1168" y="280" class="text-sub" font-size="11">🟢 6 Ready • 🔴 2 In Call</text>

  <!-- Charts & Analytics Section -->
  <rect x="280" y="320" width="744" height="280" rx="12" class="card" />
  <text x="304" y="352" class="text-main" font-size="14">📈 Call Volume &amp; Hourly Distribution</text>
  <text x="304" y="370" class="text-sub" font-size="11">Peak hours: 10:00 - 11:30 (Avg 24 calls/hr)</text>
  
  <rect x="340" y="420" width="24" height="120" rx="4" fill="#27272A" />
  <rect x="390" y="400" width="24" height="140" rx="4" fill="#27272A" />
  <rect x="440" y="360" width="24" height="180" rx="4" fill="#10B981" />
  <rect x="490" y="380" width="24" height="160" rx="4" fill="#10B981" />
  <rect x="540" y="430" width="24" height="110" rx="4" fill="#27272A" />
  <rect x="590" y="450" width="24" height="90" rx="4" fill="#27272A" />
  <rect x="640" y="410" width="24" height="130" rx="4" fill="#27272A" />
  <rect x="690" y="390" width="24" height="150" rx="4" fill="#10B981" />
  <rect x="740" y="440" width="24" height="100" rx="4" fill="#27272A" />
  <rect x="790" y="470" width="24" height="70" rx="4" fill="#27272A" />

  <!-- Top Performers Section -->
  <rect x="1040" y="320" width="376" height="280" rx="12" class="card" />
  <text x="1064" y="352" class="text-main" font-size="14">🏆 Top Performing Agents</text>

  <rect x="1064" y="374" width="328" height="56" rx="8" class="card-inner" />
  <text x="1080" y="398" class="text-main" font-size="12">🥇 Sarah Jenkins</text>
  <text x="1080" y="414" class="text-sub" font-size="11">32 calls • 42% conv • $2,840</text>

  <rect x="1064" y="440" width="328" height="56" rx="8" class="card-inner" />
  <text x="1080" y="464" class="text-main" font-size="12">🥈 John Doe</text>
  <text x="1080" y="480" class="text-sub" font-size="11">28 calls • 36% conv • $2,210</text>

  <rect x="1064" y="506" width="328" height="56" rx="8" class="card-inner" />
  <text x="1080" y="530" class="text-main" font-size="12">🥉 Mike Ross</text>
  <text x="1080" y="546" class="text-sub" font-size="11">25 calls • 31% conv • $1,890</text>

  <!-- Live Feed Section -->
  <rect x="280" y="616" width="1136" height="240" rx="12" class="card" />
  <text x="304" y="648" class="text-main" font-size="14">📋 Live Call Feed &amp; Recent Activities</text>

  <rect x="304" y="668" width="1088" height="50" rx="8" class="card-inner" />
  <text x="320" y="698" class="text-main" font-size="12">• [10:42] Customer: Petr Svoboda | Agent: John D. | Duration: 04:12 | AI Sentiment: Positive 😊</text>

  <rect x="304" y="728" width="1088" height="50" rx="8" class="card-inner" />
  <text x="320" y="758" class="text-main" font-size="12">• [10:38] Customer: Elena Novak | Agent: Sarah J. | Duration: 02:45 | AI Sentiment: Price Objection ⚡</text>

  <rect x="304" y="788" width="1088" height="50" rx="8" class="card-inner" />
  <text x="320" y="818" class="text-main" font-size="12">• [10:15] Customer: Tomas Dvorak | Agent: Mike R. | Duration: 05:30 | AI Sentiment: Competitor Offer 🏷️</text>
</svg>`;

const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'figma_template_dashboard.svg'), svgContent);
console.log('SUCCESS: public/figma_template_dashboard.svg created');
