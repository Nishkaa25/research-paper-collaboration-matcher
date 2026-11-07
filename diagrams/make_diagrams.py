import subprocess
HDR="#2F6492"; NEWC="#1B7F3B"
def table(name, cols):
    rows=[f'<TR><TD COLSPAN="3" BGCOLOR="{HDR}"><FONT COLOR="white"><B>{name}</B></FONT></TD></TR>']
    for c in cols:
        cname,ctype,flags = c[0],c[1],c[2]
        new = len(c)>3 and c[3]
        color = NEWC if new else "black"
        b1,b2 = ("<B>","</B>") if "PK" in flags else ("","")
        tag = flags
        rows.append(f'<TR><TD ALIGN="LEFT" PORT="{cname}"><FONT COLOR="{color}">{b1}{cname}{b2}</FONT></TD>'
                    f'<TD ALIGN="LEFT"><FONT COLOR="#666666" POINT-SIZE="9">{ctype}</FONT></TD>'
                    f'<TD ALIGN="LEFT">' + (f'<FONT COLOR="#B03A2E" POINT-SIZE="9">{tag}</FONT>' if tag else ' ') + '</TD></TR>')
    return f'{name} [label=<<TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="3" COLOR="#8899AA" BGCOLOR="#F7F9FB">{"".join(rows)}</TABLE>>];'

T = {
"AFFILIATION":[("affiliation_id","int","PK"),("name","varchar","NN, UQ"),("type","varchar","NN, CK"),("city","varchar",""),("country","varchar",""),("website","varchar","CK")],
"RESEARCHER":[("researcher_id","int","PK"),("full_name","varchar","NN"),("email","varchar","NN, UQ"),("bio","text",""),("department","varchar",""),("join_date","date","NN"),("affiliation_id","int","FK, NN"),
              ("orcid","varchar","UQ",1),("h_index","int","CK",1),("role","varchar","NN, CK",1),("is_active","boolean","NN",1),("password_hash","text","CK",1)],
"TOPIC":[("topic_id","int","PK"),("name","varchar","NN, UQ"),("description","text","")],
"JOURNAL_CONFERENCE":[("venue_id","int","PK"),("name","varchar","NN, UQ"),("type","varchar","NN, CK"),("publisher","varchar",""),("impact_factor","numeric","CK")],
"PAPER":[("paper_id","int","PK"),("title","varchar","NN"),("abstract","text",""),("publication_year","int","CK"),("venue_id","int","FK"),("doi","varchar","UQ, CK"),("search_vector","tsvector","GEN",1)],
"PAPER_AUTHOR":[("paper_id","int","PK, FK"),("researcher_id","int","PK, FK"),("author_position","int","NN, UQ"),("corresponding_author","boolean","NN")],
"PAPER_TOPIC":[("paper_id","int","PK, FK"),("topic_id","int","PK, FK")],
"RESEARCHER_TOPIC":[("researcher_id","int","PK, FK"),("topic_id","int","PK, FK"),("expertise_level","int","NN, CK")],
"PAPER_EMBEDDING":[("paper_id","int","PK, FK"),("embedding","vector(384)","NN"),("embedding_model","varchar","NN"),("generated_at","timestamp","NN")],
"RESEARCHER_EMBEDDING":[("researcher_id","int","PK, FK"),("embedding","vector(384)","NN"),("embedding_model","varchar","NN"),("generated_at","timestamp","NN")],
"MATCH_RESULT":[("match_id","int","PK"),("researcher_1_id","int","FK, NN"),("researcher_2_id","int","FK, NN"),("similarity_score","numeric","CK"),("created_at","timestamp","NN")],
"COLLABORATION_REQUEST":[("request_id","int","PK"),("sender_id","int","FK, NN"),("receiver_id","int","FK, NN"),("proposed_topic_id","int","FK"),("title","varchar","NN"),("message","text",""),("status","varchar","NN, CK"),("created_at","timestamp","NN"),("updated_at","timestamp","NN")],
}
E = [  # child:col -> parent:col , label
("RESEARCHER:affiliation_id","AFFILIATION:affiliation_id"),
("PAPER:venue_id","JOURNAL_CONFERENCE:venue_id"),
("PAPER_AUTHOR:paper_id","PAPER:paper_id"),("PAPER_AUTHOR:researcher_id","RESEARCHER:researcher_id"),
("PAPER_TOPIC:paper_id","PAPER:paper_id"),("PAPER_TOPIC:topic_id","TOPIC:topic_id"),
("RESEARCHER_TOPIC:researcher_id","RESEARCHER:researcher_id"),("RESEARCHER_TOPIC:topic_id","TOPIC:topic_id"),
("PAPER_EMBEDDING:paper_id","PAPER:paper_id"),("RESEARCHER_EMBEDDING:researcher_id","RESEARCHER:researcher_id"),
("MATCH_RESULT:researcher_1_id","RESEARCHER:researcher_id"),("MATCH_RESULT:researcher_2_id","RESEARCHER:researcher_id"),
("COLLABORATION_REQUEST:sender_id","RESEARCHER:researcher_id"),("COLLABORATION_REQUEST:receiver_id","RESEARCHER:researcher_id"),
("COLLABORATION_REQUEST:proposed_topic_id","TOPIC:topic_id"),
]
dot=['digraph G { rankdir=LR; splines=true; nodesep=0.35; ranksep=1.3; overlap=false; node [shape=plaintext, fontname="Helvetica", fontsize=11]; edge [color="#55687A", arrowsize=0.8, penwidth=1.2, fontname="Helvetica", fontsize=9, fontcolor="#33475B"];']
for n,c in T.items(): dot.append(table(n,c))
for ch,pa in E:
    a,ac=ch.split(":"); b,bc=pa.split(":")
    dot.append(f'{a} -> {b} [label="  {ac}  ", arrowhead=tee, arrowtail=crow, dir=both];')
dot.append('}')
open("schema.dot","w").write("\n".join(dot))
subprocess.run(["dot","-Tpng","-Gdpi=170","schema.dot","-o","schema_final.png"],check=True)

arch='''digraph A { rankdir=TB; nodesep=0.5; ranksep=0.9; node [shape=box, style="rounded,filled", fontname="Helvetica", fontsize=12, margin="0.2,0.12"]; edge [color="#55687A", fontname="Helvetica", fontsize=10];
 subgraph cluster_client { label="Browser"; style="rounded"; color="#8899AA"; fontname="Helvetica";
   ui [label="Next.js pages (React)\\nlogin - search - profile\\nmatches - requests - admin", fillcolor="#DCE9F5"]; }
 subgraph cluster_server { label="Next.js server (Route Handlers / API layer)"; style="rounded"; color="#8899AA"; fontname="Helvetica";
   auth [label="Auth + role check\\n(session cookie, roles: researcher / admin)", fillcolor="#E8F3E8"];
   api  [label="REST endpoints\\n/api/papers  /api/researchers\\n/api/matches  /api/requests", fillcolor="#E8F3E8"];
   emb  [label="Embedding service\\nall-MiniLM-L6-v2 (384-d)", fillcolor="#FFF2CC"]; }
 subgraph cluster_db { label="PostgreSQL 16 + pgvector"; style="rounded"; color="#8899AA"; fontname="Helvetica";
   rel [label="Relational tables\\nresearcher - paper - topic ...\\nconstraints - triggers - views", fillcolor="#F8D7DA"];
   vec [label="Vector tables (vector(384))\\npaper_embedding\\nresearcher_embedding\\nHNSW cosine index", fillcolor="#F8D7DA"];
   fts [label="Full-text search\\ntsvector + GIN", fillcolor="#F8D7DA"]; }
 env [label=".env.local\\nDATABASE_URL, SESSION_SECRET", shape=note, fillcolor="#EEEEEE"];
 ui -> auth [label="HTTPS"]; auth -> api; ui -> api [label="JSON"];
 api -> rel [label="parameterised SQL\\nstored procedures"]; api -> vec [label="ORDER BY embedding <=> $1"]; api -> fts [label="@@ tsquery"];
 api -> emb [label="query text"]; emb -> api [label="vector"]; emb -> vec [label="store paper vectors", style=dashed];
 env -> api [style=dashed, label="config"]; rel -> vec [style=invis]; vec -> fts [style=invis];
}'''
open("arch.dot","w").write(arch)
subprocess.run(["dot","-Tpng","-Gdpi=170","arch.dot","-o","architecture.png"],check=True)
