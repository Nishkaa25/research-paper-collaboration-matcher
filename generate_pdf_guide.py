import sys
import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "Research Paper Collaboration Matcher - Setup & Execution Guide")
            self.drawRightString(558, 750, "PES University | DBMS Level 3 Mini Project")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.75)
            self.line(54, 744, 558, 744)

        # Footer (all pages)
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.75)
        self.line(54, 45, 558, 45)
        self.drawString(54, 32, "Confidential & Academic Use Only | PostgreSQL 17 + pgvector + Next.js")
        self.drawRightString(558, 32, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#2563eb'),
        spaceAfter=14
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
        leftIndent=14,
        spaceAfter=3
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor('#0f172a'),
        backColor=colors.HexColor('#f1f5f9'),
        borderPadding=6,
        spaceBefore=4,
        spaceAfter=6
    )

    callout_style = ParagraphStyle(
        'Callout_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#1e3a8a')
    )

    story = []

    # Title Banner Box
    title_data = [
        [
            Paragraph("<b>PES UNIVERSITY</b> &bull; Department of Computer Science & Engineering<br/><font size=8.5 color='#64748b'>Database Management Systems (DBMS) Level 3 Capstone / Mini Project</font>", body_style)
        ],
        [
            Paragraph("Research Paper Collaboration Matcher", title_style)
        ],
        [
            Paragraph("<b>Project Setup, Execution, and Feature Verification Guide</b>", subtitle_style)
        ],
        [
            Paragraph(
                "<b>Architecture:</b> Next.js 14 App Router | PostgreSQL 17.11 + pgvector 0.8.0 | TypeScript | Cloud Neon DB<br/>"
                "<b>Included Database:</b> Pre-configured live cloud instance with 12 tables, 21 researchers, 40 papers, 384-d embeddings, and 21 analytical queries.",
                body_style
            )
        ]
    ]

    title_table = Table(title_data, colWidths=[504])
    title_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('PADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,-1), (-1,-1), 10),
    ]))
    story.append(title_table)
    story.append(Spacer(1, 14))

    # SECTION 1: Quick Start (2-Minute Setup)
    story.append(Paragraph("1. Instant 2-Minute Quick Start", h1_style))
    story.append(Paragraph(
        "The project is <b>ready to run out-of-the-box</b>. You do <b>not</b> need to install or compile PostgreSQL or pgvector locally unless you wish to self-host. A fully migrated and seeded cloud PostgreSQL database with pgvector is already configured in <code>.env.local</code>.",
        body_style
    ))

    steps_table_data = [
        [
            Paragraph("<b>Step</b>", body_style),
            Paragraph("<b>Action & Exact Command</b>", body_style),
            Paragraph("<b>Description</b>", body_style)
        ],
        [
            Paragraph("<b>1</b>", body_style),
            Paragraph("Extract the project folder<br/><code>cd rpcm_project</code>", code_style),
            Paragraph("Unzip the provided archive to your preferred workspace directory.", body_style)
        ],
        [
            Paragraph("<b>2</b>", body_style),
            Paragraph("Verify Environment File<br/><code>ls -la .env.local</code>", code_style),
            Paragraph("Ensure <code>.env.local</code> exists. If hidden, copy <code>env.setup.txt</code> to <code>.env.local</code>.", body_style)
        ],
        [
            Paragraph("<b>3</b>", body_style),
            Paragraph("Install Dependencies<br/><code>npm install</code>", code_style),
            Paragraph("Downloads Next.js, React, pg, bcryptjs, and icons (~30 seconds).", body_style)
        ],
        [
            Paragraph("<b>4</b>", body_style),
            Paragraph("Start Dev Server<br/><code>npm run dev</code>", code_style),
            Paragraph("Launches the local Next.js web application on port 3000.", body_style)
        ],
        [
            Paragraph("<b>5</b>", body_style),
            Paragraph("Open in Browser<br/><b>http://localhost:3000</b>", code_style),
            Paragraph("Access the web UI. Click 'Fill Researcher Demo' or 'Fill Admin Demo' to log in instantly.", body_style)
        ]
    ]

    steps_table = Table(steps_table_data, colWidths=[36, 210, 258])
    steps_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#e2e8f0')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#0f172a')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(steps_table)
    story.append(Spacer(1, 12))

    # SECTION 2: System Requirements
    story.append(Paragraph("2. System Prerequisites", h1_style))
    story.append(Paragraph(
        "&bull; <b>Node.js:</b> Version 18.17.0 or higher (v20+ LTS recommended). Download from <i>nodejs.org</i>.<br/>"
        "&bull; <b>Web Browser:</b> Google Chrome, Mozilla Firefox, Microsoft Edge, or Safari.<br/>"
        "&bull; <b>Internet Connection:</b> Required to connect to the secure Neon cloud PostgreSQL database over TLS/SSL.<br/>"
        "&bull; <b>Optional Tools:</b> VS Code (recommended editor), Git (for version control).",
        body_style
    ))
    story.append(Spacer(1, 10))

    # SECTION 3: Demo Accounts & Authentication
    story.append(Paragraph("3. Demo Accounts & Credentials", h1_style))
    story.append(Paragraph(
        "Authentication is validated via the database stored function <code>authenticate_researcher</code> using secure bcrypt salt hashing. For easy testing, <b>1-Click Demo Fill</b> buttons are present directly on the login page.",
        body_style
    ))

    creds_data = [
        [
            Paragraph("<b>Role</b>", body_style),
            Paragraph("<b>Email Address</b>", body_style),
            Paragraph("<b>Password</b>", body_style),
            Paragraph("<b>Permissions & Use Case</b>", body_style)
        ],
        [
            Paragraph("<b>Researcher</b>", body_style),
            Paragraph("<code>ananya.rao@pes.example.edu</code>", code_style),
            Paragraph("<code>Welcome@123</code>", code_style),
            Paragraph("PES University author; access matcher, papers, profile, and collaboration requests.", body_style)
        ],
        [
            Paragraph("<b>Admin</b>", body_style),
            Paragraph("<code>admin@pes.example.edu</code>", code_style),
            Paragraph("<code>Admin@123</code>", code_style),
            Paragraph("Platform admin; view metrics, deactivate users, and trigger materialized view refresh.", body_style)
        ],
        [
            Paragraph("<b>Researcher B</b>", body_style),
            Paragraph("<code>rajesh.pillai@iitm.example.edu</code>", code_style),
            Paragraph("<code>Welcome@123</code>", code_style),
            Paragraph("IIT Madras researcher; use to test receiving and approving collaboration requests.", body_style)
        ],
        [
            Paragraph("<b>Researcher C</b>", body_style),
            Paragraph("<code>rohan.sharma@pes.example.edu</code>", code_style),
            Paragraph("<code>Welcome@123</code>", code_style),
            Paragraph("Co-author of Ananya; use to test co-author badge detection in similarity matcher.", body_style)
        ]
    ]

    creds_table = Table(creds_data, colWidths=[76, 170, 90, 168])
    creds_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#e2e8f0')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(creds_table)
    story.append(Spacer(1, 14))

    # SECTION 4: Application Feature Walkthrough
    story.append(Paragraph("4. Feature-by-Feature Testing & Verification Guide", h1_style))
    story.append(Paragraph(
        "Follow these steps to demonstrate every core requirement of the DBMS project:",
        body_style
    ))

    features_list = [
        ("A. Collaboration Matcher (Vector Similarity)", "/matcher",
         "1. Navigate to <b>/matcher</b>.<br/>"
         "2. Select any researcher from the dropdown (default: Ananya Rao).<br/>"
         "3. Adjust the <b>Cosine Similarity Threshold</b> slider (e.g. 0.40 to 0.70).<br/>"
         "4. <b>Observe:</b> Ranked results powered by <code>pgvector</code> HNSW distance operator (<code>&lt;=&gt;</code>). Notice shared topic badges, institution info, and co-authorship tags.<br/>"
         "5. Click <b>'Request Collaboration'</b> to test sending a collaboration proposal."),

        ("B. Paper Search (Full-Text Search & Semantic Concept Search)", "/papers",
         "1. Navigate to <b>/papers</b>.<br/>"
         "2. In <b>Full-Text Search</b> mode, enter keywords such as <code>'reinforcement learning'</code> or <code>'federated cloud'</code>. Results are ranked by <code>ts_rank</code> with GIN index acceleration.<br/>"
         "3. Switch to <b>Semantic Concept Search</b>. Enter natural queries such as <i>'privacy preserving distributed training on edge devices'</i>. Results are retrieved using dense embeddings.<br/>"
         "4. Click <b>'+ Add New Paper'</b> to execute an ACID multi-table INSERT DML transaction (inserting into <code>paper</code>, <code>paper_author</code>, and <code>paper_topic</code>)."),

        ("C. Collaboration Requests Lifecycle (Atomic Procedures & Triggers)", "/requests",
         "1. Navigate to <b>/requests</b>.<br/>"
         "2. Click <b>'Outgoing Outbox'</b> to view requests sent by your logged-in researcher.<br/>"
         "3. To approve a request, log out and sign in as the recipient (e.g., Rajesh Pillai: <code>rajesh.pillai@iitm.example.edu</code>).<br/>"
         "4. In <b>'Incoming Inbox'</b>, click <b>'Accept Collaboration'</b>. This executes the atomic stored procedure <code>CALL respond_to_request(...)</code>, updates status, locks rows with <code>FOR UPDATE</code>, dynamically calculates cosine similarity, and creates a verified record in <code>match_result</code>.<br/>"
         "5. Check trigger enforcement: Once accepted or rejected, status changes are immutable."),

        ("D. SQL Benchmark Showcase (All 21 Academic DBMS Queries)", "/queries",
         "1. Navigate to <b>/queries</b>.<br/>"
         "2. Select any of the <b>21 academic queries</b> categorized across: Multi-table JOINs, GROUP BY & HAVING, Correlated Subqueries, Window Functions (DENSE_RANK, OVER), CTEs (WITH RECURSIVE), and Index Plan inspections (EXPLAIN ANALYZE).<br/>"
         "3. Click <b>'Run Query'</b> to execute live on PostgreSQL and view raw records and latency in milliseconds."),

        ("E. Admin Dashboard & Materialized Views", "/admin",
         "1. Sign in as Admin (<code>admin@pes.example.edu</code>) and navigate to <b>/admin</b>.<br/>"
         "2. View system metrics: active researchers, total papers, embeddings, and match pairs.<br/>"
         "3. Toggle researcher active status (<code>is_active</code>) to demonstrate trigger <code>trg_cr_active_sender</code> blocking inactive users.<br/>"
         "4. Click <b>'Refresh Materialized Views'</b> to execute <code>REFRESH MATERIALIZED VIEW mv_topic_trends</code>.")
    ]

    for title, route, desc in features_list:
        card_data = [
            [Paragraph(f"<b>{title}</b> &nbsp;&nbsp;<font color='#2563eb'>Route: {route}</font>", h2_style)],
            [Paragraph(desc, body_style)]
        ]
        t = Table(card_data, colWidths=[504])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
            ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor('#e2e8f0')),
            ('PADDING', (0,0), (-1,-1), 7),
        ]))
        story.append(t)
        story.append(Spacer(1, 8))

    # SECTION 5: Advanced Database Features Checklist
    story.append(PageBreak())
    story.append(Paragraph("5. Phase 2 Advanced DBMS Concepts Checklist", h1_style))
    story.append(Paragraph(
        "The project implements all 8 advanced database concepts with at least 2 distinct implementations each:",
        body_style
    ))

    db_features_data = [
        [
            Paragraph("<b>Concept</b>", body_style),
            Paragraph("<b>Implementation 1</b>", body_style),
            Paragraph("<b>Implementation 2</b>", body_style)
        ],
        [
            Paragraph("<b>1. Transactions</b>", body_style),
            Paragraph("<b>SAVEPOINT & Partial Rollback:</b> <code>SAVEPOINT before_mistake</code>, undoes erroneous changes (<code>05_dml_operations.sql#L111</code>).", body_style),
            Paragraph("<b>Atomic Procedure:</b> <code>CALL respond_to_request</code> with <code>FOR UPDATE</code> row locking and multi-table consistency.", body_style)
        ],
        [
            Paragraph("<b>2. Views</b>", body_style),
            Paragraph("<b>Dynamic View:</b> <code>v_researcher_profile</code> with 5-table join, <code>string_agg</code>, and publication metrics.", body_style),
            Paragraph("<b>Materialized View:</b> <code>mv_topic_trends</code> with unique index and on-demand cache refresh.", body_style)
        ],
        [
            Paragraph("<b>3. Stored Procs & Functions</b>", body_style),
            Paragraph("<b>Function:</b> <code>find_similar_researchers(id, k)</code> returns ranked vector matches and shared topic counts.", body_style),
            Paragraph("<b>Procedure:</b> <code>respond_to_request(req_id, user_id, dec)</code> atomic approval and pair registration.", body_style)
        ],
        [
            Paragraph("<b>4. Triggers</b>", body_style),
            Paragraph("<b>Lifecycle Rule:</b> <code>trg_cr_lifecycle</code> enforces request state immutability once resolved.", body_style),
            Paragraph("<b>Pair Normalizer:</b> <code>trg_match_normalize</code> guarantees <code>id1 &lt; id2</code> to prevent duplicate inverse pairs.", body_style)
        ],
        [
            Paragraph("<b>5. Indexing</b>", body_style),
            Paragraph("<b>HNSW Vector Index:</b> <code>idx_paper_embedding_hnsw</code> for sub-ms 384-dimensional cosine distance.", body_style),
            Paragraph("<b>GIN Full-Text Index:</b> <code>idx_paper_fts</code> on <code>tsvector</code> for keyword search.", body_style)
        ],
        [
            Paragraph("<b>6. Full-Text Search</b>", body_style),
            Paragraph("<b>Ranked Search:</b> <code>websearch_to_tsquery</code> + <code>ts_rank</code> with English stemming and stop-words.", body_style),
            Paragraph("<b>Contextual Highlighting:</b> <code>ts_headline</code> generating preview snippets with custom delimiter tags.", body_style)
        ],
        [
            Paragraph("<b>7. Vector Search</b>", body_style),
            Paragraph("<b>Cosine Distance:</b> <code>&lt;=&gt;</code> distance operator with 384-d MiniLM embeddings.", body_style),
            Paragraph("<b>Profile Synthesis:</b> Centroid vector aggregation (<code>avg(pe.embedding)</code>) across papers.", body_style)
        ],
        [
            Paragraph("<b>8. NoSQL Aggregation</b>", body_style),
            Paragraph("<b>JSONB Document:</b> <code>jsonb_build_object</code> + <code>jsonb_agg</code> generating complete hierarchical researcher profiles.", body_style),
            Paragraph("<b>Venue Analytics:</b> Nested publication JSON structures with <code>jsonb_pretty</code> formatting.", body_style)
        ]
    ]

    db_table = Table(db_features_data, colWidths=[90, 207, 207])
    db_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#e2e8f0')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(db_table)
    story.append(Spacer(1, 14))

    # SECTION 6: Project Directory Structure
    story.append(Paragraph("6. Project Directory Structure", h1_style))
    tree_text = (
        "rpcm_project/<br/>"
        "|-- app/                 Next.js App Router (pages: /, /login, /matcher, /papers, /requests, /queries, /admin)<br/>"
        "|-- app/api/             Backend REST API endpoints (auth, matches, papers, requests, admin, analytics)<br/>"
        "|-- components/          Reusable React UI components (Navbar, Modals, Badges)<br/>"
        "|-- lib/                 Database client (pg connection pool) and auth session token handling<br/>"
        "|-- sql/                 Official academic SQL scripts (01_schema through 08_security_roles)<br/>"
        "|-- diagrams/            ER Diagram, Relational Schema, and UI verification screenshots<br/>"
        "|-- .env.local           Database credentials for live Neon PostgreSQL cloud connection<br/>"
        "|-- env.setup.txt        Backup plain-text environment configuration<br/>"
        "|-- package.json         Project scripts and NPM dependencies<br/>"
        "|-- README.md            Comprehensive project documentation & team member contributions"
    )
    story.append(Paragraph(tree_text, code_style))
    story.append(Spacer(1, 10))

    # SECTION 7: Troubleshooting & FAQ
    story.append(PageBreak())
    story.append(Paragraph("7. Troubleshooting & Frequently Asked Questions (FAQ)", h1_style))

    faq_items = [
        ("Q: Port 3000 is already in use by another application. How do I fix this?",
         "Run the Next.js dev server on an alternate port: <code>npm run dev -- -p 3001</code>, then open <code>http://localhost:3001</code>."),
        
        ("Q: Does my friend need to install PostgreSQL or pgvector on their computer?",
         "<b>No.</b> The project connects directly to the cloud Neon PostgreSQL database over SSL (configured in <code>.env.local</code>). The database already has the schema, extensions, and sample seed data pre-loaded."),

        ("Q: What if .env.local does not show up after unzipping?",
         "Some operating systems hide files starting with a dot ('.'). A plain-text backup file named <b><code>env.setup.txt</code></b> is included in the project root. Simply rename or copy it to <b><code>.env.local</code></b>."),

        ("Q: How can I run the automated SQL test suite?",
         "The database includes a 50-test automated verification suite in <code>sql/07_tests.sql</code> covering constraints, foreign keys, triggers, and procedures. All 50 tests pass with zero errors (evidence in <code>output/07_tests.out</code>)."),

        ("Q: How do I build for production instead of dev mode?",
         "Run <code>npm run build</code> (compiles all 24 routes cleanly), followed by <code>npm start</code>.")
    ]

    for q, a in faq_items:
        story.append(Paragraph(f"<b>{q}</b>", h2_style))
        story.append(Paragraph(a, body_style))
        story.append(Spacer(1, 4))

    story.append(Spacer(1, 14))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=14))
    story.append(Paragraph(
        "<b>PES University &bull; Database Management Systems Level 3 Mini Project</b><br/>"
        "Project Repository &copy; 2026. All academic requirements and deliverables satisfied.",
        callout_style
    ))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[SUCCESS] PDF successfully created: {filename}")

if __name__ == '__main__':
    out_path = sys.argv[1] if len(sys.argv) > 1 else 'Project_Setup_and_Execution_Guide.pdf'
    build_pdf(out_path)
