# Research Paper Collaboration Matcher (RPCM)

A semantic research discovery and collaboration platform that connects researchers based on their research interests, published papers, and semantic similarity.

**Course:** DBMS Experiential Learning – Level 3 Project  
**Institution:** PES University, Department of Computer Science and Engineering

## Team Members

| Name | SRN |
|---|---|
| Nishkaa V | PES2UG24CS907 |
| Arjav Chandranath | PES2UG24CS080 |

---

## 1. Project Overview

Research collaboration often requires researchers to manually search through publications, identify people working on similar topics, and determine whether potential collaborators have compatible research interests.

The Research Paper Collaboration Matcher (RPCM) aims to simplify this process through semantic search, vector embeddings, and relational database operations.

The platform allows researchers to:

- Create and manage researcher profiles.
- Publish and browse research papers.
- Search papers using natural-language queries.
- Discover researchers with semantically similar research interests.
- View researcher profiles and their associated publications.
- Send, receive, accept, reject, and manage collaboration requests.
- Explore research analytics and collaboration information.

Unlike a conventional keyword-based search system, RPCM uses sentence embeddings and vector similarity to identify relationships between research papers and researcher profiles.

## 2. Technology Stack

### Frontend

| Technology | Purpose |
|---|---|
| Next.js 14 | React-based application framework and application routing |
| React | Component-based user interface |
| TypeScript | Type safety and maintainable application code |
| CSS / CSS Modules | Styling and responsive page layouts |

The frontend includes the researcher dashboard, login interface, paper library, semantic matcher, profile pages, collaboration request interface, analytics pages, and academic paper reader.

### Backend

| Technology | Purpose |
|---|---|
| Next.js API Routes | Server-side endpoints and application backend |
| Node.js | JavaScript runtime |
| TypeScript | Backend implementation and type checking |
| PostgreSQL | Relational data storage |
| Neon | Managed cloud PostgreSQL database |

The backend handles authentication, researcher information, paper management, semantic search, collaboration requests, and database operations.

### Database and Vector Search

| Technology | Purpose |
|---|---|
| PostgreSQL | Stores relational application data |
| Neon PostgreSQL | Cloud-hosted database |
| pgvector | Stores and searches high-dimensional vector embeddings |
| SQL | Schema creation, queries, joins, views, functions and triggers |
| Psycopg | Python-to-PostgreSQL database connectivity |

RPCM uses a relational database alongside vector search. This allows conventional SQL operations and semantic similarity search to work together.

### Machine Learning and Embeddings

| Technology | Purpose |
|---|---|
| Python | Embedding generation and database processing scripts |
| Sentence Transformers | Generates semantic sentence embeddings |
| all-MiniLM-L6-v2 | Pretrained sentence-transformer model |
| Hugging Face | Hosts the pretrained model and its downloadable files |
| NumPy | Numerical operations on embedding vectors |

## 3. Semantic Embedding Generation

RPCM uses the pretrained `sentence-transformers/all-MiniLM-L6-v2` model to generate semantic representations of research papers.

The model converts textual content into numerical vectors containing **384 dimensions**.

### Paper Embeddings

For each paper, the system uses its textual content, particularly its title and abstract, to generate a semantic embedding.

The generated vector is stored in the `paper_embedding` table alongside the associated paper ID and model information.

### Researcher Embeddings

A researcher may have multiple published papers.

Instead of representing a researcher using only one paper, RPCM constructs a researcher-level embedding by calculating the mean of the embeddings of their associated papers.

Conceptually:

`Researcher Embedding = Mean(Paper Embeddings)`

This creates a consolidated representation of the researcher's overall interests.

The resulting researcher embedding is stored in `researcher_embedding`.

### Why all-MiniLM-L6-v2?

The model was selected because it provides relatively lightweight sentence embeddings while capturing semantic relationships between text.

For example, a search for:

`Privacy-aware distributed computing`

may retrieve papers discussing federated learning, secure distributed systems, and privacy-preserving computation, even when the exact search phrase does not appear in their abstracts.

## 4. How pgvector Is Used

pgvector is a PostgreSQL extension that enables vector storage and similarity operations directly inside the relational database.

RPCM uses pgvector to store the 384-dimensional embeddings generated by MiniLM.

The application uses cosine similarity to compare vectors and identify semantically related papers and researchers.

The general cosine similarity formula is:

`similarity(A, B) = (A · B) / (||A|| × ||B||)`

A higher similarity score indicates a stronger directional similarity between the vectors.

### Semantic Collaborator Matching

The collaborator matching workflow is as follows:

1. Retrieve the target researcher's embedding.
2. Compare it with other researcher embeddings using vector similarity.
3. Rank potential collaborators according to similarity.
4. Enrich the results using relational database information.
5. Retrieve shared research topics and publication information.
6. Exclude the researcher's existing co-authors from recommendations.
7. Return the ranked collaborator recommendations.

The database function `find_similar_researchers()` performs the collaborator recommendation operation.

The application also considers relational information such as shared topics and existing co-authorship relationships.

### Semantic Paper Search

RPCM also supports semantic paper search.

A natural-language query is converted into an embedding using the same MiniLM model.

The query embedding is compared with stored paper embeddings to retrieve papers based on semantic similarity rather than exact keyword matching.

## 5. Database Design

The project uses a relational database schema to represent researchers, publications, authorship, topics, embeddings, and collaboration activity.

Important database entities include:

| Table | Purpose |
|---|---|
| `researcher` | Stores researcher profiles and account information |
| `paper` | Stores research paper metadata and abstracts |
| `paper_author` | Represents the many-to-many relationship between researchers and papers |
| `topic` | Stores research topics |
| `researcher_topic` | Associates researchers with research topics |
| `paper_topic` | Associates papers with research topics |
| `paper_embedding` | Stores paper-level vector embeddings |
| `researcher_embedding` | Stores researcher-level vector embeddings |
| `match_result` | Stores collaborator matching results |
| `collaboration_request` | Stores collaboration requests and their statuses |

The `paper_author` table is particularly important because multiple researchers can author one paper, and one researcher can publish multiple papers.

This is implemented through an associative entity representing the many-to-many relationship.

### Database Features

The project incorporates:

- DDL operations for database creation and modification.
- DML operations for inserting, updating and deleting records.
- Relational queries using joins and subqueries.
- Views for retrieving structured information.
- Stored functions for collaborator matching and other operations.
- Triggers for maintaining database consistency.
- Constraints and keys for enforcing data integrity.
- Role-based database security and access control.
- Vector operations through pgvector.

## 6. Main Application Features

### 6.1 Researcher Authentication

Researchers can log in and access their respective application interfaces.

The application includes authentication-related API endpoints for login, logout, and retrieving the current user.

### 6.2 Researcher Dashboard

The dashboard provides an overview of researcher information, publication activity, and collaboration-related data.

### 6.3 Research Paper Library

Users can browse available research papers and inspect their titles, abstracts, authors, and associated topics.

### 6.4 Semantic Paper Search

Users can enter natural-language queries and discover relevant papers through MiniLM-generated embeddings and vector similarity search.

### 6.5 Semantic Collaborator Matcher

The collaborator matcher identifies researchers with similar research interests using researcher-level embeddings.

Recommendations include similarity information, shared topics, and existing co-authorship information.

### 6.6 Researcher Profiles

Researcher profiles display information about individual researchers and their associated publications.

### 6.7 Collaboration Requests

Researchers can send collaboration requests to potential collaborators.

The application supports request management, including:

- Sending requests.
- Viewing received requests.
- Accepting requests.
- Rejecting requests.
- Withdrawing requests.

### 6.8 Research Analytics

The application includes analytics interfaces for examining research and collaboration-related information.

### 6.9 Academic Research Paper Reader

RPCM includes an IEEE-inspired, two-column academic paper reader.

The reader presents synthetic full-text documents using an academic paper structure, including:

- Paper title and author information.
- Abstract.
- Index Terms.
- Numbered academic sections.
- Methodology and proposed evaluation sections.
- Discussion and conclusion.
- Publication metadata.

The document generator uses paper-specific information to produce more contextually relevant synthetic research documents.

**Important:** These documents are synthetic demonstrations, not actual peer-reviewed publications. Their generated methodology and evaluation discussions should not be interpreted as verified experimental findings.

## 7. Synthetic Dataset

The current demonstration environment uses synthetic researcher and research-paper records.

The initial dataset contained 40 papers and 20 researcher accounts, with additional demonstration papers subsequently added.

The database has been populated with generated paper embeddings and researcher-level embeddings.

Synthetic data allows the application to demonstrate:

- Semantic paper discovery.
- Researcher similarity calculations.
- Topic overlap.
- Co-authorship relationships.
- Collaboration request workflows.
- Academic document presentation.

Although the records are synthetic, the embeddings are generated using the actual pretrained Sentence Transformers model.

## 8. Project Structure

```text
rpcm_project/
│
├── app/
│   ├── admin/
│   ├── api/
│   │   ├── admin/
│   │   ├── analytics/
│   │   ├── auth/
│   │   ├── matches/
│   │   ├── papers/
│   │   ├── requests/
│   │   ├── researchers/
│   │   └── topics/
│   ├── dashboard/
│   ├── login/
│   ├── matcher/
│   ├── papers/
│   ├── profile/
│   ├── queries/
│   └── requests/
│
├── components/
│   └── Navbar.tsx
│
├── diagrams/
│   ├── architecture.png
│   ├── schema_final.png
│   └── ...
│
├── lib/
│   ├── auth.ts
│   ├── db.ts
│   └── embeddings.ts
│
├── scripts/
│   ├── embed_single_paper.py
│   ├── refresh_synthetic_paper_documents.py
│   └── seed_synthetic_paper_documents.py
│
├── sql/
│   ├── 01_schema.sql
│   ├── 02_alter_ddl.sql
│   ├── 03_views_functions_triggers.sql
│   ├── 04_seed.sql
│   ├── 05_dml_operations.sql
│   ├── 06_queries.sql
│   ├── 07_tests.sql
│   ├── 08_security_roles.sql
│   └── 10_create_synthetic_paper_documents.sql
│
├── embed_papers.py
├── generate_seed.py
├── package.json
├── .env.example
└── README.md
```

## 9. Installation and Setup

### Prerequisites

- Node.js and npm.
- Python.
- A Neon PostgreSQL database.
- Git.
- A Hugging Face model download connection for the first embedding generation.

### Step 1: Clone the repository

```bash
git clone https://github.com/Nishkaa25/research-paper-collaboration-matcher.git
cd research-paper-collaboration-matcher
```

### Step 2: Install Node.js dependencies

```bash
npm install
```

### Step 3: Configure environment variables

Create a `.env.local` file in the project root.

Configure the required environment variables using `.env.example` as the reference.

At minimum, the application requires the Neon PostgreSQL connection string:

```env
DATABASE_URL=your_neon_database_connection_string
```

Never commit `.env.local` or expose database credentials publicly.

### Step 4: Set up the database

Execute the SQL scripts against the configured PostgreSQL database in the appropriate order.

The scripts establish the schema, relationships, constraints, views, functions, triggers, seed data, and synthetic document storage.

The pgvector extension must be available in the database.

### Step 5: Start the Next.js application

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### Step 6: Install Python dependencies for embedding generation

Create a Python virtual environment and install the required libraries:

```bash
python -m venv .venv-embeddings
```

On Windows:

```powershell
.\.venv-embeddings\Scripts\python.exe -m pip install sentence-transformers psycopg[binary] pgvector numpy
```

### Step 7: Generate paper and researcher embeddings

Ensure `DATABASE_URL` is configured in the environment and run:

```powershell
.\.venv-embeddings\Scripts\python.exe .\embed_papers.py
```

This process loads the pretrained MiniLM model, retrieves paper records, generates paper embeddings, stores the vectors in Neon, and rebuilds researcher-level embeddings.

### Step 8: Run individual embedding and document utilities

The `scripts/` directory contains utilities for embedding individual papers and generating or refreshing synthetic full-text paper documents.

Refer to the relevant script before executing it to understand its database requirements and operation.

## 10. Future Enhancements

Potential future improvements include:

- Integration with real research-paper repositories and APIs.
- Retrieval of verified paper metadata and publication URLs.
- Access to publicly available full-text research papers.
- More advanced researcher representations using publication history and research interests.
- Larger-scale semantic retrieval and vector indexing.
- Improved ranking using topic overlap, publication relevance, and collaboration history.
- Automated ingestion of new research papers.
- More extensive evaluation using real research datasets.
- Improved recommendation explainability.

## 11. Important Project Limitations

- The current demonstration dataset is synthetic.
- Synthetic paper documents are generated for demonstration and are not verified academic publications.
- MiniLM embeddings represent semantic information in the supplied text; they do not independently verify its factual accuracy.
- Similarity scores indicate vector similarity, not guaranteed research compatibility.
- The current project is a research collaboration prototype, not a production-validated recommendation system.

## 12. Repository

**GitHub:** https://github.com/Nishkaa25/research-paper-collaboration-matcher

---

**Developed by**

**Nishkaa V** — PES2UG24CS907  
**Arjav Chandranath** — PES2UG24CS080

PES University  
Department of Computer Science and Engineering

DBMS Experiential Learning – Level 3 Project
