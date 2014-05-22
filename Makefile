all: data.tsv

data.tsv:
	scp benschmidt.org:/tmp/tmp.tsv data.tsv
