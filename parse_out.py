import re, json, sys
def parse_tables(lines):
    tables=[]; i=0
    while i < len(lines):
        if re.match(r'^-+(\+-+)*-*$', lines[i].strip()) and i>0 and lines[i-1].strip() and ('|' in lines[i-1] or True) and set(lines[i].strip()) <= set('-+') and len(lines[i].strip())>2:
            hdr=[c.strip() for c in lines[i-1].split('|')]
            rows=[]; j=i+1
            while j < len(lines) and not re.match(r'^\(\d+ rows?\)', lines[j].strip()):
                if lines[j].strip()=="" : break
                rows.append([c.strip() for c in lines[j].split('|')]); j+=1
            tables.append({"cols":hdr,"rows":rows}); i=j
        i+=1
    return tables
def sections(path, marker):
    txt=open(path).read().splitlines(); secs=[]; cur=None
    for ln in txt:
        if ln.startswith(marker):
            cur={"title":ln[len(marker):].strip(),"lines":[]}; secs.append(cur)
        elif cur is not None: cur["lines"].append(ln)
    return secs
out={}
q=sections('output/06_queries.out','--- ')
out["queries"]=[{"title":s["title"],"tables":parse_tables(s["lines"]),"raw":"\n".join(s["lines"]).strip()} for s in q]
d=sections('output/05_dml_operations.out','=== ')
out["dml_raw"]=open('output/05_dml_operations.out').read()
out["dml_tables"]=parse_tables(open('output/05_dml_operations.out').read().splitlines())
t=open('output/07_tests.out').read().splitlines()
tt=parse_tables(t)
out["tests"]=tt[0]; out["test_summary"]=tt[1]
json.dump(out,open('output/parsed.json','w'),indent=1)
print(len(out["queries"]),"queries;", [ (s["title"][:12], len(s["tables"])) for s in out["queries"]][:25])
print("dml tables",len(out["dml_tables"]), "tests",len(out["tests"]["rows"]), out["test_summary"])
