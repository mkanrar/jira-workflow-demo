"""
Sandbox data simulating GitHub PRs, JIRA stories, and CI/CD pipelines.
Replace these with real API calls when production keys are available.
"""

from datetime import datetime, timedelta

# ─── GitHub Sandbox Data ──────────────────────────────────────────────────────

SANDBOX_PRS = [
    {
        "id": 1,
        "number": 142,
        "title": "Add pagination support to Product Listing API",
        "author": "milon",
        "branch": "feature/PROJ-142-pagination",
        "base": "main",
        "status": "open",
        "size": "M",
        "additions": 87,
        "deletions": 12,
        "changed_files": 4,
        "reviewers": [],
        "labels": ["enhancement", "api"],
        "created_at": (datetime.now() - timedelta(hours=3)).isoformat(),
        "updated_at": (datetime.now() - timedelta(hours=1)).isoformat(),
        "jira_story": "PROJ-142",
        "description": "",
        "ci_status": "passing",
        "diff": """diff --git a/src/controllers/ProductController.js b/src/controllers/ProductController.js
index a3f2b1c..7e8d9a2 100644
--- a/src/controllers/ProductController.js
+++ b/src/controllers/ProductController.js
@@ -12,8 +12,22 @@ const ProductController = {
   async getProducts(req, res) {
     try {
-      const products = await ProductService.findAll();
-      res.json({ products });
+      const page = parseInt(req.query.page) || 1;
+      const limit = parseInt(req.query.limit) || 20;
+      const offset = (page - 1) * limit;
+
+      const { products, total } = await ProductService.findAll({ offset, limit });
+
+      res.json({
+        products,
+        pagination: {
+          page,
+          limit,
+          total,
+          totalPages: Math.ceil(total / limit),
+          hasNext: page < Math.ceil(total / limit),
+          hasPrev: page > 1
+        }
+      });
     } catch (err) {
       res.status(500).json({ error: err.message });
     }
   },

diff --git a/src/services/ProductService.js b/src/services/ProductService.js
index c1d3e45..9f2a3b8 100644
--- a/src/services/ProductService.js
+++ b/src/services/ProductService.js
@@ -5,7 +5,12 @@ const ProductService = {
-  async findAll() {
-    return db.query('SELECT * FROM products');
+  async findAll({ offset = 0, limit = 20 } = {}) {
+    const products = await db.query(
+      'SELECT * FROM products ORDER BY created_at DESC LIMIT $1 OFFSET $2',
+      [limit, offset]
+    );
+    const [{ count: total }] = await db.query('SELECT COUNT(*) FROM products');
+    return { products, total: parseInt(total) };
   },

diff --git a/tests/ProductController.test.js b/tests/ProductController.test.js
index d7a1c23..4e5f8b1 100644
--- a/tests/ProductController.test.js
+++ b/tests/ProductController.test.js
@@ -20,6 +20,18 @@ describe('ProductController', () => {
+  it('should return pagination metadata', async () => {
+    const res = await request(app).get('/api/products?page=2&limit=10');
+    expect(res.body.pagination).toBeDefined();
+    expect(res.body.pagination.page).toBe(2);
+    expect(res.body.pagination.limit).toBe(10);
+  });
 });""",
        "file_list": ["src/controllers/ProductController.js", "src/services/ProductService.js", "tests/ProductController.test.js", "docs/api/products.md"]
    },
    {
        "id": 2,
        "number": 138,
        "title": "Implement JWT refresh token rotation",
        "author": "milon",
        "branch": "feature/PROJ-138-jwt-refresh",
        "base": "develop",
        "status": "merged",
        "size": "L",
        "additions": 203,
        "deletions": 45,
        "changed_files": 8,
        "reviewers": ["rahul_dev", "priya_tech"],
        "labels": ["security", "auth"],
        "created_at": (datetime.now() - timedelta(days=2)).isoformat(),
        "updated_at": (datetime.now() - timedelta(days=1)).isoformat(),
        "jira_story": "PROJ-138",
        "description": "Implements secure JWT refresh token rotation to prevent token reuse attacks.",
        "ci_status": "passing",
        "diff": """diff --git a/src/auth/TokenService.js b/src/auth/TokenService.js
+++ b/src/auth/TokenService.js
@@ -0,0 +1,45 @@
+const jwt = require('jsonwebtoken');
+const crypto = require('crypto');
+
+class TokenService {
+  generateAccessToken(userId) {
+    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
+  }
+
+  generateRefreshToken() {
+    return crypto.randomBytes(64).toString('hex');
+  }
+
+  async rotateRefreshToken(oldToken, db) {
+    const stored = await db.refreshTokens.findOne({ token: oldToken });
+    if (!stored || stored.used) throw new Error('Invalid or reused token');
+
+    await db.refreshTokens.update({ token: oldToken }, { used: true });
+    const newToken = this.generateRefreshToken();
+    await db.refreshTokens.create({ token: newToken, userId: stored.userId });
+    return { accessToken: this.generateAccessToken(stored.userId), refreshToken: newToken };
+  }
+}""",
        "file_list": ["src/auth/TokenService.js", "src/auth/AuthController.js", "src/middleware/auth.js", "tests/auth/TokenService.test.js"]
    },
    {
        "id": 3,
        "number": 145,
        "title": "WIP: Dashboard analytics widget refactor",
        "author": "milon",
        "branch": "feature/PROJ-145-dashboard-widget",
        "base": "develop",
        "status": "draft",
        "size": "S",
        "additions": 34,
        "deletions": 8,
        "changed_files": 2,
        "reviewers": [],
        "labels": ["frontend", "wip"],
        "created_at": (datetime.now() - timedelta(hours=6)).isoformat(),
        "updated_at": (datetime.now() - timedelta(minutes=45)).isoformat(),
        "jira_story": "PROJ-145",
        "description": "",
        "ci_status": "failing",
        "diff": """diff --git a/src/components/AnalyticsWidget.jsx b/src/components/AnalyticsWidget.jsx
--- a/src/components/AnalyticsWidget.jsx
+++ b/src/components/AnalyticsWidget.jsx
@@ -5,12 +5,28 @@
-function AnalyticsWidget({ data }) {
-  return <div>{data.value}</div>;
+function AnalyticsWidget({ data, config }) {
+  const chartData = useMemo(() => transformData(data, config.type), [data, config]);
+
+  if (!chartData || chartData.length === 0) {
+    return <EmptyState message="No data available" />;
+  }
+
+  return (
+    <div className="widget-container">
+      <h3>{config.title}</h3>
+      <Chart data={chartData} type={config.type} />
+      <MetricSummary metrics={chartData.summary} />
+    </div>
+  );
+}""",
        "file_list": ["src/components/AnalyticsWidget.jsx", "src/utils/chartTransforms.js"]
    },
    {
        "id": 4,
        "number": 140,
        "title": "Fix memory leak in WebSocket connection handler",
        "author": "milon",
        "branch": "fix/PROJ-140-ws-memory-leak",
        "base": "main",
        "status": "open",
        "size": "S",
        "additions": 22,
        "deletions": 18,
        "changed_files": 2,
        "reviewers": ["rahul_dev"],
        "labels": ["bug", "critical"],
        "created_at": (datetime.now() - timedelta(days=1)).isoformat(),
        "updated_at": (datetime.now() - timedelta(hours=5)).isoformat(),
        "jira_story": "PROJ-140",
        "description": "Fixes event listener cleanup on WebSocket disconnect to prevent memory accumulation.",
        "ci_status": "passing",
        "diff": """diff --git a/src/websocket/ConnectionHandler.js b/src/websocket/ConnectionHandler.js
--- a/src/websocket/ConnectionHandler.js
+++ b/src/websocket/ConnectionHandler.js
@@ -15,6 +15,10 @@
   ws.on('message', handleMessage);
   ws.on('error', handleError);

+  ws.on('close', () => {
+    ws.removeEventListener('message', handleMessage);
+    ws.removeEventListener('error', handleError);
+    activeConnections.delete(ws);
+  });
 });""",
        "file_list": ["src/websocket/ConnectionHandler.js", "tests/websocket.test.js"]
    },
]

# ─── JIRA Sandbox Data ────────────────────────────────────────────────────────

SANDBOX_STORIES = [
    {
        "id": "PROJ-142",
        "title": "Product Listing API \u2014 Add Pagination Support",
        "type": "Story",
        "status": "In Review",
        "priority": "High",
        "assignee": "Milon",
        "sprint": "Sprint 24",
        "points": 5,
        "epic": "Performance Improvements Q2",
        "created_at": (datetime.now() - timedelta(days=4)).isoformat(),
        "updated_at": (datetime.now() - timedelta(hours=2)).isoformat(),
        "description": "The product listing endpoint returns all records without pagination, causing slow load times with 10k+ products. Implement cursor/offset pagination with configurable page size. Acceptance Criteria: 1) GET /api/products?page=N&limit=M returns paginated results. 2) Response includes pagination metadata. 3) Default limit is 20, max is 100. 4) Unit tests cover all edge cases.",
        "comments": [
            {"author": "PM Sarah", "text": "This is blocking the mobile app team. Please prioritize.", "time": "2 days ago"},
            {"author": "Milon", "text": "PR raised, review in progress.", "time": "3 hours ago"},
        ],
        "linked_pr": 142,
        "blocked": False,
    },
    {
        "id": "PROJ-145",
        "title": "Refactor Dashboard Analytics Widget for Reusability",
        "type": "Story",
        "status": "In Progress",
        "priority": "Medium",
        "assignee": "Milon",
        "sprint": "Sprint 24",
        "points": 3,
        "epic": "Dashboard v2",
        "created_at": (datetime.now() - timedelta(days=3)).isoformat(),
        "updated_at": (datetime.now() - timedelta(hours=6)).isoformat(),
        "description": "Current AnalyticsWidget is tightly coupled to a single data format. Refactor to accept config-driven rendering so it can be reused across 5 different dashboard panels. Acceptance Criteria: 1) Widget accepts a config prop with type (bar/line/pie). 2) Handles empty data gracefully. 3) No existing dashboard functionality broken.",
        "comments": [
            {"author": "UI Lead Priya", "text": "Check the Figma designs I shared \u2014 the metric summary should be below the chart.", "time": "1 day ago"},
        ],
        "linked_pr": 145,
        "blocked": False,
    },
    {
        "id": "PROJ-147",
        "title": "Integrate SendGrid for Transactional Emails",
        "type": "Story",
        "status": "To Do",
        "priority": "High",
        "assignee": "Milon",
        "sprint": "Sprint 24",
        "points": 8,
        "epic": "Notifications System",
        "created_at": (datetime.now() - timedelta(days=5)).isoformat(),
        "updated_at": (datetime.now() - timedelta(days=5)).isoformat(),
        "description": "Integrate SendGrid to send welcome emails, password reset, and order confirmation emails. Acceptance Criteria: 1) EmailService class with send(), sendTemplate() methods. 2) Three email templates configured in SendGrid. 3) Retry logic on failure. 4) Logs all email events.",
        "comments": [],
        "linked_pr": None,
        "blocked": False,
        "sprint_risk": True,
    },
    {
        "id": "PROJ-140",
        "title": "Fix Memory Leak in WebSocket Connection Handler",
        "type": "Bug",
        "status": "In Review",
        "priority": "Critical",
        "assignee": "Milon",
        "sprint": "Sprint 24",
        "points": 2,
        "epic": "Infrastructure Stability",
        "created_at": (datetime.now() - timedelta(days=6)).isoformat(),
        "updated_at": (datetime.now() - timedelta(hours=5)).isoformat(),
        "description": "Under high load (500+ concurrent connections), memory usage grows unbounded. Root cause: event listeners not cleaned up on disconnect. Fix by removing listeners in the close handler.",
        "comments": [
            {"author": "DevOps Amit", "text": "Prod server restarted twice this week due to OOM. Urgent fix needed.", "time": "5 hours ago"},
            {"author": "Milon", "text": "Fix is in review, should merge today.", "time": "3 hours ago"},
        ],
        "linked_pr": 140,
        "blocked": False,
    },
    {
        "id": "PROJ-138",
        "title": "Implement JWT Refresh Token Rotation",
        "type": "Story",
        "status": "Done",
        "priority": "High",
        "assignee": "Milon",
        "sprint": "Sprint 24",
        "points": 5,
        "epic": "Security Hardening",
        "created_at": (datetime.now() - timedelta(days=8)).isoformat(),
        "updated_at": (datetime.now() - timedelta(days=1)).isoformat(),
        "description": "Prevent JWT token reuse attacks by implementing refresh token rotation. Old tokens must be invalidated after use.",
        "comments": [
            {"author": "Security Lead", "text": "LGTM. Good implementation of rotation pattern.", "time": "1 day ago"},
        ],
        "linked_pr": 138,
        "blocked": False,
    },
    {
        "id": "PROJ-149",
        "title": "Write API Documentation for v2 Endpoints",
        "type": "Task",
        "status": "To Do",
        "priority": "Low",
        "assignee": "Milon",
        "sprint": "Sprint 25",
        "points": 3,
        "epic": "Developer Experience",
        "created_at": (datetime.now() - timedelta(days=1)).isoformat(),
        "updated_at": (datetime.now() - timedelta(days=1)).isoformat(),
        "description": "Write OpenAPI 3.0 documentation for all v2 API endpoints. Use Swagger UI for interactive docs.",
        "comments": [],
        "linked_pr": None,
        "blocked": False,
    },
]

# ─── CI/CD Sandbox Data ──────────────────────────────────────────────────────

SANDBOX_PIPELINES = [
    {
        "id": "build-4823",
        "pr_number": 142,
        "branch": "feature/PROJ-142-pagination",
        "status": "passing",
        "trigger": "push",
        "duration": "2m 34s",
        "started_at": (datetime.now() - timedelta(hours=1)).isoformat(),
        "stages": [
            {"name": "Install", "status": "passed", "duration": "18s"},
            {"name": "Lint", "status": "passed", "duration": "12s"},
            {"name": "Unit Tests", "status": "passed", "duration": "47s"},
            {"name": "Integration Tests", "status": "passed", "duration": "1m 3s"},
            {"name": "Build", "status": "passed", "duration": "14s"},
        ],
        "test_summary": {"passed": 147, "failed": 0, "skipped": 3},
        "log_snippet": "[18:32:10] Installing dependencies...\n[18:32:28] Lint: OK\n[18:32:40] Running unit tests...\n[18:33:27] PASS src/controllers/ProductController.test.js\n[18:33:28] Test Suites: 12 passed, 12 total\n[18:33:28] Tests: 147 passed, 3 skipped, 150 total\n[18:33:28] BUILD SUCCESS",
    },
    {
        "id": "build-4821",
        "pr_number": 145,
        "branch": "feature/PROJ-145-dashboard-widget",
        "status": "failing",
        "trigger": "push",
        "duration": "1m 52s",
        "started_at": (datetime.now() - timedelta(hours=2)).isoformat(),
        "stages": [
            {"name": "Install", "status": "passed", "duration": "17s"},
            {"name": "Lint", "status": "passed", "duration": "11s"},
            {"name": "Unit Tests", "status": "failed", "duration": "48s"},
            {"name": "Integration Tests", "status": "skipped", "duration": "-"},
            {"name": "Build", "status": "skipped", "duration": "-"},
        ],
        "test_summary": {"passed": 89, "failed": 2, "skipped": 14},
        "log_snippet": """[16:14:10] Installing dependencies...
[16:14:27] Lint: OK
[16:14:38] Running unit tests...
[16:14:55] FAIL src/components/AnalyticsWidget.test.jsx

  ● AnalyticsWidget › renders chart with config prop
    TypeError: Cannot read properties of undefined (reading 'type')
      at transformData (src/utils/chartTransforms.js:14:28)
      at AnalyticsWidget (src/components/AnalyticsWidget.jsx:8:32)

  ● AnalyticsWidget › displays EmptyState when data is empty
    Expected: "No data available"
    Received: null

[16:15:26] Test Suites: 1 failed, 11 passed, 12 total
[16:15:26] Tests: 2 failed, 89 passed, 14 skipped, 105 total
[16:15:26] BUILD FAILED""",
    },
    {
        "id": "build-4820",
        "pr_number": 140,
        "branch": "fix/PROJ-140-ws-memory-leak",
        "status": "passing",
        "trigger": "push",
        "duration": "1m 58s",
        "started_at": (datetime.now() - timedelta(hours=5)).isoformat(),
        "stages": [
            {"name": "Install", "status": "passed", "duration": "16s"},
            {"name": "Lint", "status": "passed", "duration": "10s"},
            {"name": "Unit Tests", "status": "passed", "duration": "52s"},
            {"name": "Integration Tests", "status": "passed", "duration": "40s"},
            {"name": "Build", "status": "passed", "duration": "14s"},
        ],
        "test_summary": {"passed": 132, "failed": 0, "skipped": 5},
        "log_snippet": "[11:05:10] Running tests...\n[11:05:55] PASS src/websocket/ConnectionHandler.test.js\n[11:06:01] Tests: 132 passed, 5 skipped\n[11:06:02] BUILD SUCCESS",
    },
    {
        "id": "build-4819",
        "pr_number": 138,
        "branch": "feature/PROJ-138-jwt-refresh",
        "status": "passing",
        "trigger": "merge",
        "duration": "3m 12s",
        "started_at": (datetime.now() - timedelta(days=1)).isoformat(),
        "stages": [
            {"name": "Install", "status": "passed", "duration": "19s"},
            {"name": "Lint", "status": "passed", "duration": "13s"},
            {"name": "Unit Tests", "status": "passed", "duration": "1m 10s"},
            {"name": "Integration Tests", "status": "passed", "duration": "1m 20s"},
            {"name": "Build", "status": "passed", "duration": "10s"},
        ],
        "test_summary": {"passed": 186, "failed": 0, "skipped": 2},
        "log_snippet": "[09:15:10] All tests passed.\n[09:18:22] BUILD SUCCESS",
    },
]

# ─── Dashboard Summary ────────────────────────────────────────────────────────

def get_dashboard_summary():
    open_prs = len([p for p in SANDBOX_PRS if p["status"] == "open"])
    draft_prs = len([p for p in SANDBOX_PRS if p["status"] == "draft"])
    merged_prs = len([p for p in SANDBOX_PRS if p["status"] == "merged"])
    failing_builds = len([p for p in SANDBOX_PIPELINES if p["status"] == "failing"])
    passing_builds = len([p for p in SANDBOX_PIPELINES if p["status"] == "passing"])
    stories_in_progress = len([s for s in SANDBOX_STORIES if s["status"] in ["In Progress", "In Review"]])
    stories_todo = len([s for s in SANDBOX_STORIES if s["status"] == "To Do"])
    stories_done = len([s for s in SANDBOX_STORIES if s["status"] == "Done"])
    sprint_risk = len([s for s in SANDBOX_STORIES if s.get("sprint_risk")])

    return {
        "prs": {"open": open_prs, "draft": draft_prs, "merged": merged_prs, "total": len(SANDBOX_PRS)},
        "builds": {"passing": passing_builds, "failing": failing_builds, "pass_rate": round(passing_builds / len(SANDBOX_PIPELINES) * 100)},
        "jira": {"in_progress": stories_in_progress, "todo": stories_todo, "done": stories_done, "sprint_risk": sprint_risk, "total": len(SANDBOX_STORIES)},
        "activity": [
            {"time": "30 min ago", "type": "build", "message": "Build #4823 passed \u2014 PR #142 (PROJ-142)", "status": "success"},
            {"time": "2 hrs ago",  "type": "build", "message": "Build #4821 failed \u2014 PR #145 (PROJ-145)", "status": "error"},
            {"time": "3 hrs ago",  "type": "pr",    "message": "PR #142 raised \u2014 Pagination API", "status": "info"},
            {"time": "5 hrs ago",  "type": "build", "message": "Build #4820 passed \u2014 PR #140 (PROJ-140)", "status": "success"},
            {"time": "6 hrs ago",  "type": "pr",    "message": "PR #145 created as draft \u2014 Dashboard widget", "status": "info"},
            {"time": "1 day ago",  "type": "jira",  "message": "PROJ-138 moved to Done after merge", "status": "success"},
            {"time": "1 day ago",  "type": "build", "message": "Build #4819 passed \u2014 PR #138 (PROJ-138)", "status": "success"},
        ],
    }
