#!/usr/bin/env python3
"""
Generates sql/04_seed.sql  (sample data for the Research Paper Collaboration Matcher).

Embeddings
----------
In production, paper vectors come from a sentence-embedding model (all-MiniLM-L6-v2, 384-d)
run over  title + ". " + abstract.  To keep this seed self-contained and reproducible
(no model download needed) the vectors below are SYNTHETIC: every topic gets a fixed random
unit vector and a paper's vector is the normalised sum of its topic vectors plus small noise.
Papers that share topics therefore land close together in cosine space, which is exactly the
behaviour a real model gives, so all similarity queries in the demo are meaningful.
Re-embed with embed_papers.py to replace them with real model vectors.
"""
import random, math, os

random.seed(42)
DIM = 384

# ------------------------------------------------------------------ master data
AFF = [  # name, type, city, country, website
 ("PES University","University","Bengaluru","India","https://pes.edu"),
 ("Indian Institute of Science","University","Bengaluru","India","https://iisc.ac.in"),
 ("IIT Madras","University","Chennai","India","https://www.iitm.ac.in"),
 ("Microsoft Research India","Industry","Bengaluru","India","https://www.microsoft.com/en-us/research/lab/microsoft-research-india/"),
 ("Indian Space Research Organisation","Government","Bengaluru","India","https://www.isro.gov.in"),
 ("Massachusetts Institute of Technology","University","Cambridge","United States","https://www.mit.edu"),
 ("University of Oxford","University","Oxford","United Kingdom","https://www.ox.ac.uk"),
 ("ETH Zurich","University","Zurich","Switzerland","https://ethz.ch"),
 ("National University of Singapore","University","Singapore","Singapore","https://www.nus.edu.sg"),
 ("Max Planck Institute for Informatics","Research Institute","Saarbrucken","Germany","https://www.mpi-inf.mpg.de"),
]
TOPICS = [
 ("Machine Learning","Statistical learning methods that improve from data."),
 ("Deep Learning","Multi-layer neural network models and their training."),
 ("Natural Language Processing","Computational analysis and generation of human language."),
 ("Computer Vision","Extracting understanding from images and video."),
 ("Reinforcement Learning","Learning sequential decision policies from reward signals."),
 ("Cloud Computing","On-demand virtualised computing, storage and services."),
 ("Distributed Systems","Coordination, consistency and fault tolerance across machines."),
 ("Databases","Data models, storage engines, indexing and query processing."),
 ("Information Retrieval","Search, ranking and recommendation over large collections."),
 ("Cybersecurity","Protecting systems, networks and data from attack."),
 ("Computer Networks","Protocols, routing and traffic management."),
 ("Bioinformatics","Computational methods for biological data."),
 ("Human-Computer Interaction","Design and evaluation of interactive systems."),
 ("Robotics","Perception, planning and control for autonomous machines."),
 ("Graph Neural Networks","Neural models operating on graph-structured data."),
 ("Edge Computing","Computation placed close to data sources and users."),
]
VENUES = [  # name, type, publisher, impact factor (illustrative)
 ("NeurIPS","Conference","NeurIPS Foundation",None),
 ("ACL","Conference","Association for Computational Linguistics",None),
 ("CVPR","Conference","IEEE/CVF",None),
 ("VLDB","Conference","VLDB Endowment",None),
 ("IEEE Transactions on Cloud Computing","Journal","IEEE",5.30),
 ("ACM Computing Surveys","Journal","ACM",23.80),
 ("Nature Machine Intelligence","Journal","Springer Nature",18.80),
 ("arXiv","Preprint","Cornell University",None),
 ("USENIX NSDI","Conference","USENIX Association",None),
 ("ACM CHI","Conference","ACM",None),
]
DOMAIN = ["pes","iisc","iitm","msri","isro","mit","ox","ethz","nus","mpi"]  # by AFF index
# id: (name, aff_idx(1-based), department, bio, h_index, join_year)
RES = {
 1:("Ananya Rao",1,"Computer Science","Works on scheduling and autoscaling for cloud platforms.",14,2019),
 2:("Karthik Subramanian",2,"Computer Science and Automation","Machine learning researcher interested in learned systems and safe RL.",27,2015),
 3:("Meera Iyer",3,"Computer Science","Builds language technologies for Indian languages and scientific text.",19,2017),
 4:("Rohan Deshpande",1,"Computer Science","Researches query optimisation, indexing and privacy in databases.",12,2020),
 5:("Priya Natarajan",4,"Machine Learning Group","Representation learning for vision, with a focus on efficient models.",21,2016),
 6:("Sameer Khan",2,"Electrical Communication Engineering","Network security and robust machine learning for intrusion detection.",16,2018),
 7:("Elena Fischer",8,"Computer Science","Distributed systems, networking and fault-tolerant data processing.",38,2012),
 8:("James Whitaker",6,"CSAIL","Reinforcement learning for robotics and control.",33,2013),
 9:("Li Wei",9,"Computer Science","Graph neural networks and their applications to systems and biology.",24,2016),
 10:("Sophie Laurent",7,"Computer Science","Retrieval and language models for scholarly documents.",22,2017),
 11:("Vikram Malhotra",3,"Biotechnology","Computational biology and machine learning on genomic data.",18,2018),
 12:("Aisha Rahman",10,"Databases and Information Systems","Search systems, vector indexes and hybrid retrieval.",26,2014),
 13:("Arjun Menon",5,"Remote Sensing","Computer vision for satellite imagery and autonomous navigation.",15,2019),
 14:("Divya Krishnan",1,"Design and Interaction","Interfaces for exploring and evaluating scholarly information.",11,2021),
 15:("Thomas Becker",8,"Information Security","Applied cryptography, zero-trust and network security.",35,2011),
 16:("Neha Kulkarni",6,"Computational Biology","Deep learning for biomedical images and drug discovery.",20,2017),
 17:("Rajesh Pillai",3,"Computer Science","Edge and cloud computing, resource management and telemetry.",13,2020),
 18:("Hannah Cole",7,"Computer Science","Trustworthy machine learning and reproducibility in research.",17,2018),
 19:("Sanjay Gupta",9,"Computer Science","Distributed databases and large-scale training systems.",23,2015),
 20:("Farah Ahmed",4,"Language Technologies","Compact language models and citation-aware NLP.",16,2019),
 21:("Portal Administrator",1,"Research Office","Platform administrator account.",None,2022),
}
ADMIN = 21
# (title, abstract, year, venue_idx(1-based), [topics], [author ids; first = corresponding])
P = [
 ("Adaptive Autoscaling of Cloud Workloads Using Deep Reinforcement Learning","We present an autoscaling controller that uses deep reinforcement learning to scale virtual machines under bursty workloads, reducing SLA violations while lowering cost.",2023,5,["Cloud Computing","Reinforcement Learning"],[1,8]),
 ("Energy-Aware Task Scheduling in Heterogeneous Data Centres","This paper proposes an energy-aware scheduler for heterogeneous cloud data centres that balances makespan and power consumption with a multi-objective heuristic.",2022,5,["Cloud Computing","Distributed Systems"],[1,7]),
 ("Latency-Aware Task Offloading for Smart-City Edge Computing","We design an offloading policy that chooses between edge nodes and the cloud to minimise end-to-end latency for smart-city applications.",2023,8,["Edge Computing","Cloud Computing","Computer Networks"],[17]),
 ("Container Placement Across the Edge-Cloud Continuum","A placement algorithm for containers across edge and cloud sites is introduced, accounting for bandwidth limits and data locality.",2024,5,["Edge Computing","Distributed Systems"],[17,7]),
 ("Fault Tolerance in Large-Scale Stream Processing Systems","We analyse failure recovery in distributed stream processors and propose a lightweight checkpointing scheme with lower recovery time.",2022,9,["Distributed Systems"],[7,19]),
 ("Consistency Trade-offs in Geo-Replicated Databases","This work studies consistency models for geo-replicated databases and quantifies the latency cost of stronger guarantees.",2021,4,["Databases","Distributed Systems"],[19,4]),
 ("Learned Index Structures for Range Queries","We evaluate learned index structures against B-trees for range queries and show where machine learning indexes reduce lookup time and memory.",2023,4,["Databases","Machine Learning"],[4,2]),
 ("Query Optimisation with Graph Neural Networks","A graph neural network predicts query plan costs from operator trees, improving join order selection over traditional cost models.",2024,4,["Databases","Graph Neural Networks","Deep Learning"],[4,9]),
 ("Vector Similarity Search Inside Relational Databases","We study approximate nearest neighbour indexes inside relational engines, comparing HNSW and IVF on recall and query latency.",2024,4,["Databases","Information Retrieval"],[12,19]),
 ("Hybrid Keyword and Semantic Retrieval for Scholarly Search","A hybrid system combines BM25 keyword ranking with dense embeddings to improve recall on academic search queries.",2023,2,["Information Retrieval","Natural Language Processing"],[10,12]),
 ("Transformer Models for Scientific Text Summarisation","We fine-tune transformer models to summarise scientific articles and evaluate factual consistency against human-written abstracts.",2022,2,["Natural Language Processing","Deep Learning"],[3,20]),
 ("Cross-Lingual Embeddings for Low-Resource Indian Languages","This paper builds multilingual sentence embeddings for low-resource Indian languages and evaluates them on retrieval and classification tasks.",2023,2,["Natural Language Processing","Machine Learning"],[3,10]),
 ("Citation Recommendation Using Contextual Embeddings","We recommend citations for a draft manuscript by matching contextual sentence embeddings against a corpus of prior work.",2024,8,["Information Retrieval","Natural Language Processing","Deep Learning"],[20,10]),
 ("Detecting Misinformation in Academic Preprints","We build a classifier that flags misleading claims in preprints using language features and citation context.",2024,8,["Natural Language Processing","Machine Learning"],[3,18]),
 ("Self-Supervised Representation Learning for Medical Images","We pre-train vision models on unlabeled medical scans with contrastive objectives and transfer them to diagnosis tasks.",2023,3,["Computer Vision","Deep Learning"],[5,16]),
 ("Efficient Vision Transformers for On-Device Inference","We prune and quantise vision transformers so that they run within the memory and power budget of edge devices.",2024,3,["Computer Vision","Deep Learning","Edge Computing"],[5,13]),
 ("Satellite Image Segmentation with Limited Labels","A semi-supervised segmentation approach is proposed for satellite imagery where labelled examples are scarce.",2022,3,["Computer Vision","Machine Learning"],[13,2]),
 ("Protein Function Prediction with Graph Neural Networks","We model proteins as residue graphs and use graph neural networks to predict molecular function.",2023,7,["Bioinformatics","Graph Neural Networks","Deep Learning"],[11,16,9]),
 ("Genomic Variant Classification with Gradient Boosting","We classify genomic variants with gradient boosted trees and compare interpretability against deep models.",2022,8,["Bioinformatics","Machine Learning"],[11,2]),
 ("Deep Learning for Drug Response Prediction: A Survey","This survey reviews deep learning models that predict drug response from genomic and chemical data.",2023,6,["Bioinformatics","Deep Learning","Machine Learning"],[16,11]),
 ("Federated Intrusion Detection Across Organisations","We train intrusion detection models with federated learning so that organisations never share raw traffic logs.",2023,8,["Cybersecurity","Machine Learning","Distributed Systems"],[6,2]),
 ("Adversarial Attacks on Network Intrusion Classifiers","We craft adversarial traffic that evades neural intrusion classifiers and propose a defence based on robust training.",2022,1,["Cybersecurity","Deep Learning","Computer Networks"],[6,15]),
 ("Zero-Trust Architecture for Multi-Cloud Deployments","This paper presents a zero-trust access architecture for workloads spanning several cloud providers.",2024,5,["Cybersecurity","Cloud Computing"],[15,1]),
 ("Privacy-Preserving Query Processing on Encrypted Data","We execute selection and join queries directly over encrypted columns and measure the performance overhead.",2021,4,["Cybersecurity","Databases"],[15,4]),
 ("Learning-Based Congestion Control for Data-Centre Networks","A reinforcement learning congestion controller adapts sending rates to changing data-centre traffic.",2023,8,["Computer Networks","Reinforcement Learning","Machine Learning"],[7,8]),
 ("Software-Defined Networking for Time-Sensitive Traffic","We schedule time-sensitive flows in software-defined networks to guarantee bounded latency.",2022,8,["Computer Networks","Distributed Systems"],[15,7]),
 ("Sample-Efficient Reinforcement Learning for Robotic Manipulation","We reduce the number of interactions needed to learn grasping policies with model-based reinforcement learning.",2023,1,["Reinforcement Learning","Robotics","Deep Learning"],[8,13]),
 ("Safe Exploration in Reinforcement Learning","This work constrains exploration so that reinforcement learning agents avoid unsafe states during training.",2022,1,["Reinforcement Learning","Machine Learning"],[8,2]),
 ("Multi-Robot Path Planning with Graph Neural Networks","Graph neural networks coordinate paths for teams of robots in cluttered environments.",2024,1,["Robotics","Graph Neural Networks"],[13,9]),
 ("Explainable Recommendation Interfaces for Researchers","We study how explanations in a paper recommender affect trust and adoption among researchers.",2023,10,["Human-Computer Interaction","Information Retrieval"],[14,18]),
 ("Visual Analytics for Exploring Citation Networks","An interactive visual tool lets researchers explore citation networks and discover research communities.",2022,10,["Human-Computer Interaction","Graph Neural Networks"],[14,9]),
 ("Accessibility Evaluation of Scholarly Web Portals","We audit scholarly web portals against accessibility guidelines and report common usability barriers.",2024,10,["Human-Computer Interaction"],[14]),
 ("Federated Learning at the Edge for Health Monitoring","We train health monitoring models across wearable devices at the edge without centralising patient data.",2024,7,["Machine Learning","Edge Computing","Bioinformatics"],[17,11]),
 ("Graph Embeddings for Knowledge Graph Completion","We learn graph embeddings that predict missing links in large knowledge graphs.",2023,1,["Graph Neural Networks","Machine Learning"],[9,10]),
 ("Bias in Large Language Models for Scholarly Tasks","We measure demographic and geographic bias in language models used for reviewing and recommending papers.",2024,2,["Natural Language Processing","Machine Learning"],[10,18]),
 ("Distributed Training of Deep Networks on Commodity Clusters","We reduce communication overhead when training deep networks on clusters of commodity machines.",2022,5,["Deep Learning","Distributed Systems","Cloud Computing"],[19,5]),
 ("Serverless Architectures for Machine Learning Inference","We evaluate serverless platforms for model inference and propose warm-start strategies that lower tail latency.",2024,5,["Cloud Computing","Machine Learning"],[1,20]),
 ("Time-Series Anomaly Detection in Cloud Telemetry","An anomaly detector for cloud telemetry combines statistical and learned models to find incidents earlier.",2023,5,["Cloud Computing","Machine Learning"],[17,2]),
 ("Knowledge Distillation for Compact Language Models","We distil large language models into compact students that retain most accuracy at a fraction of the cost.",2024,2,["Natural Language Processing","Deep Learning"],[20,3]),
 ("Reproducibility of Machine Learning Research: A Survey","We survey reproducibility practices in machine learning papers and propose a checklist for authors.",2021,6,["Machine Learning","Human-Computer Interaction"],[18,2]),
]

# ------------------------------------------------------------------ helpers
def q(s):
    return "NULL" if s is None else "'" + str(s).replace("'", "''") + "'"

def unit(v):
    n = math.sqrt(sum(x*x for x in v)); return [x/n for x in v]

topic_vec = {t[0]: unit([random.gauss(0,1) for _ in range(DIM)]) for t in TOPICS}
def paper_vec(topics):
    v = [0.0]*DIM
    for t in topics:
        for i,x in enumerate(topic_vec[t]): v[i] += x
    noise = [random.gauss(0,1)*0.35/math.sqrt(DIM)*math.sqrt(len(topics)) for _ in range(DIM)]
    return unit([a+b for a,b in zip(v,noise)])
def vec_lit(v): return "'[" + ",".join(f"{x:.4f}" for x in v) + "]'"

# ------------------------------------------------------------------ emit
out = []
w = out.append
w("-- =====================================================================")
w("--  File 04 : Sample data (generated by generate_seed.py)")
w("--  Names, papers and DOIs are fictional. Vectors are synthetic (see generate_seed.py).")
w("--  All sample accounts use the password  Welcome@123  (admin: Admin@123),")
w("--  stored only as bcrypt hashes.")
w("-- =====================================================================")
w("BEGIN;\n")

w("-- AFFILIATION")
w("INSERT INTO affiliation (name, type, city, country, website) VALUES")
w(",\n".join(f"  ({q(a[0])}, {q(a[1])}, {q(a[2])}, {q(a[3])}, {q(a[4])})" for a in AFF) + ";\n")

w("-- TOPIC")
w("INSERT INTO topic (name, description) VALUES")
w(",\n".join(f"  ({q(t[0])}, {q(t[1])})" for t in TOPICS) + ";\n")

w("-- JOURNAL_CONFERENCE")
w("INSERT INTO journal_conference (name, type, publisher, impact_factor) VALUES")
w(",\n".join(f"  ({q(v[0])}, {q(v[1])}, {q(v[2])}, {'NULL' if v[3] is None else v[3]})" for v in VENUES) + ";\n")

w("-- RESEARCHER (passwords hashed with bcrypt via pgcrypto)")
w("INSERT INTO researcher (full_name, email, bio, department, join_date, affiliation_id, orcid, h_index, role, password_hash) VALUES")
rows=[]
for rid,(name,aff,dept,bio,h,jy) in RES.items():
    parts=name.replace("Portal ","portal.").split()
    local=".".join(p.lower() for p in name.split()) if rid!=ADMIN else "admin"
    email=f"{local}@{DOMAIN[aff-1]}.example.edu"
    orcid = None if rid==ADMIN else f"0000-0002-{1800+rid:04d}-{rid:04d}"
    role = "admin" if rid==ADMIN else "researcher"
    pwd  = "Admin@123" if rid==ADMIN else "Welcome@123"
    jd = f"{jy}-{(rid%12)+1:02d}-{(rid*3)%27+1:02d}"
    rows.append(f"  ({q(name)}, {q(email)}, {q(bio)}, {q(dept)}, '{jd}', {aff}, {q(orcid)}, {'NULL' if h is None else h}, '{role}', crypt('{pwd}', gen_salt('bf', 6)))")
w(",\n".join(rows)+";\n")

tid = {t[0]:i+1 for i,t in enumerate(TOPICS)}

w("-- PAPER")
w("INSERT INTO paper (title, abstract, publication_year, venue_id, doi) VALUES")
rows=[]
for i,(title,abs_,yr,ven,tops,auth) in enumerate(P, start=1):
    doi = None if VENUES[ven-1][1]=="Preprint" else f"10.5555/rpcm.{yr}.{i:03d}"
    rows.append(f"  ({q(title)}, {q(abs_)}, {yr}, {ven}, {q(doi)})")
w(",\n".join(rows)+";\n")

w("-- PAPER_AUTHOR (first author is the corresponding author)")
w("INSERT INTO paper_author (paper_id, researcher_id, author_position, corresponding_author) VALUES")
rows=[]
for i,(_,_,_,_,_,auth) in enumerate(P, start=1):
    for pos,r in enumerate(auth, start=1):
        rows.append(f"  ({i}, {r}, {pos}, {'TRUE' if pos==1 else 'FALSE'})")
w(",\n".join(rows)+";\n")

w("-- PAPER_TOPIC")
w("INSERT INTO paper_topic (paper_id, topic_id) VALUES")
rows=[f"  ({i}, {tid[t]})" for i,(_,_,_,_,tops,_) in enumerate(P, start=1) for t in tops]
w(",\n".join(rows)+";\n")

w("-- RESEARCHER_TOPIC (expertise = 2 + number of the researcher's papers on the topic, capped at 5)")
cnt={}
for _,_,_,_,tops,auth in P:
    for r in auth:
        for t in tops: cnt[(r,t)] = cnt.get((r,t),0)+1
w("INSERT INTO researcher_topic (researcher_id, topic_id, expertise_level) VALUES")
rows=[f"  ({r}, {tid[t]}, {min(5,2+c)})" for (r,t),c in sorted(cnt.items())]
w(",\n".join(rows)+";\n")

w("-- PAPER_EMBEDDING (384-d, synthetic)")
w("INSERT INTO paper_embedding (paper_id, embedding) VALUES")
rows=[f"  ({i}, {vec_lit(paper_vec(tops))})" for i,(_,_,_,_,tops,_) in enumerate(P, start=1)]
w(",\n".join(rows)+";\n")

w("COMMIT;\n")

w("-- Derived data: researcher profile vectors, matches, materialised view")
w("SELECT refresh_researcher_embeddings() AS researcher_embeddings_built;")
w("SELECT generate_matches(4, 0.30)       AS matches_generated;")
w("REFRESH MATERIALIZED VIEW mv_topic_trends;\n")

w("-- COLLABORATION_REQUEST : sent as Pending, then resolved through the stored procedures")
reqs = [
 (1,17,"Cloud","Joint work on edge-cloud autoscaling","Our autoscaling work and your edge offloading results look complementary. Would you like to co-author a paper?"),
 (16,20,"Deep Learning","Language models for biomedical literature","We could combine drug-response models with your compact language models to mine biomedical papers."),
 (4,12,"Databases","Vector indexes in PostgreSQL","Interested in benchmarking pgvector HNSW against your hybrid retrieval system."),
 (6,7,"Cybersecurity","Robust intrusion detection in the data centre","Would you be open to a collaboration on adversarially robust network monitoring?"),
 (2,12,"Databases","Learned indexes meet vector search","We would like to test learned index structures on approximate nearest-neighbour workloads."),
 (10,2,"Machine Learning","Bias auditing for learned systems","Let us study bias and reproducibility in learned models used for scholarly tasks."),
 (14,5,"Human-Computer Interaction","Interfaces for on-device paper recommenders","Would you like to explore lightweight vision-based reading aids?"),
 (16,13,"Computer Vision","Medical and satellite imaging transfer","Self-supervised pre-training might transfer between medical and satellite images."),
 (13,14,"Human-Computer Interaction","Exploring satellite imagery archives","We need a usable interface for browsing large satellite image archives."),
 (19,10,"Information Retrieval","Distributed scholarly retrieval","We could scale your hybrid retrieval ideas across a geo-distributed index."),
]
w("DO $$ BEGIN")
for s,r,t,title,msg in reqs:
    w(f"  CALL send_collaboration_request({s}, {r}, {tid['Cloud Computing' if t=='Cloud' else t]}, {q(title)}, {q(msg)});")
w("END $$;\n")
w("-- Resolve some of them (request ids follow insertion order)")
w("CALL respond_to_request(1, 17, 'Accepted');")
w("CALL respond_to_request(2, 20, 'Accepted');")
w("CALL respond_to_request(3, 12, 'Rejected');")
w("CALL respond_to_request(6, 2,  'Accepted');")
w("CALL withdraw_request(9, 13);")
w("-- requests 4, 5, 7, 8, 10 remain Pending\n")
w("ANALYZE;")

open("sql/04_seed.sql","w").write("\n".join(out)+"\n")
print("wrote sql/04_seed.sql", os.path.getsize("sql/04_seed.sql"), "bytes")
