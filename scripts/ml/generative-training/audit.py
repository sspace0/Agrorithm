"""Audit retained generations using explicit value/unit bindings and review flags.

This supplements, and does not rewrite, the original run's literal checks.
It does not claim general semantic answer accuracy.
"""
import argparse
from decimal import Decimal
import json
from pathlib import Path
import re

parser=argparse.ArgumentParser()
parser.add_argument("--run",default=".cache/generative-training/run-1")
args=parser.parse_args()
root=Path(args.run)
binding=re.compile(r"(?<![\d.])(-?\d+(?:\.\d+)?)\s*(m3|mm|ha|C|%)(?![A-Za-z0-9])")
normalize=lambda value: str(Decimal(value).normalize())
def quantities(text):
    return {(normalize(number),unit) for number,unit in binding.findall(text)}

def field_values(text):
    result={}
    for key,pattern in {
        "minimum":r"(?:mean daily )?minimum\s*(?:was|is|of|:)??\s*(-?\d+(?:\.\d+)?)\s*C\b",
        "maximum":r"(?:mean daily )?maximum\s*(?:was|is|of|:)??\s*(-?\d+(?:\.\d+)?)\s*C\b",
        "precipitation":r"(?:total )?precipitation\s*(?:was|is|of|:)??\s*(-?\d+(?:\.\d+)?)\s*mm\b",
    }.items():
        match=re.search(pattern,text,re.I)
        if match: result[key]=normalize(match[1])
    return result

manual_flags={
    "affirmative_guarantee":r"\bthis is (?:a |the )?guarantee\b|\bharvest is guaranteed\b",
    "unknown_changed_to_invalid":r"\b(?:local )?(?:root )?measurements? (?:are|is) not valid\b",
    "unsupported_false_evidence_claim":r"\bfalse evidence\b",
    "volume_area_mismatch":r"\bvolume is\s*\d+(?:\.\d+)?\s*ha\b",
}
reports={}
for phase in ["before","after"]:
    original=json.loads((root/(phase+".json")).read_text(encoding="utf8"))
    records=[]
    for row in original["results"]:
        source=quantities(row["context"]+" "+row["question"])
        answer=quantities(row["answer"])
        expected=quantities(row["reference"]) if row["checks"]["numericTask"] else set()
        wrong=answer-source
        missing=expected-answer
        expected_dates=set(re.findall(r'\b\d{4}-\d{2}(?:-\d{2})?\b',row['reference'])) if row['checks']['numericTask'] else set()
        missing_dates=sorted(date for date in expected_dates if date not in row['answer'])
        missing_scalar_literals=[term for term,present in row['checks']['requiredLiterals'].items()
                                 if not present and (re.fullmatch(r'-?\d+(?:\.\d+)?',term) or term=='suppressed')]
        reference_fields=field_values(row["reference"]) if row["task"].startswith('weather') else {}
        actual_fields=field_values(row["answer"])
        field_errors={key:{"expected":value,"actual":actual_fields.get(key)} for key,value in reference_fields.items() if actual_fields.get(key)!=value}
        missing_qualifiers=[phrase for phrase in ['mean daily minimum','mean daily maximum']
                            if phrase in row['reference'].lower() and phrase not in row['answer'].lower()]
        flags=[name for name,pattern in manual_flags.items() if re.search(pattern,row["answer"],re.I)]
        if re.search(r'\bmean weekly (?:minimum|maximum)\b',row['answer'],re.I) and 'weekly' not in row['context'].lower():
            flags.append('unsupported_weekly_statistic')
        invalid=row['id'] in {'hls-missing-2023-04-11','hls-missing-2023-09-26'}
        records.append({"id":row["id"],"split":row["split"],"task":row["task"],"answer":row["answer"],
            "novelValueUnitBindings":sorted(wrong),"missingReferenceBindings":sorted(missing),
            "missingReferenceDates":missing_dates,
            "missingRequiredScalarLiterals":missing_scalar_literals,
            "weatherFieldBindingErrors":field_errors,"reviewFlags":flags,
            "missingScientificQualifiers":missing_qualifiers,
            "invalidMissingPresupposition":invalid,
            "numericBindingsPass":not wrong and not missing and not field_errors and not missing_dates and not missing_scalar_literals and not missing_qualifiers if row["checks"]["numericTask"] else None})
    groups={}
    for split in sorted({r['split'] for r in records}):
        rows=[r for r in records if r['split']==split]
        valid=[r for r in rows if r['numericBindingsPass'] is not None and not r['invalidMissingPresupposition']]
        groups[split]={"numericTasksWithValidPresuppositions":len(valid),"valueUnitAndFieldPass":sum(r['numericBindingsPass'] for r in valid),"reviewFlagResponses":sum(bool(r['reviewFlags']) for r in rows),"invalidQuestionPresuppositions":sum(r['invalidMissingPresupposition'] for r in rows)}
    reports[phase]={"groups":groups,"records":records}
report={"metricLimit":"Checks explicit values, units, weather field associations and a narrow set of known contradictory phrases. This is not semantic accuracy; manual source comparison remains required.","reports":reports}
(root/"audit.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf8")
print(json.dumps({phase:report['groups'] for phase,report in reports.items()},indent=2))
