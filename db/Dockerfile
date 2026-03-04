FROM postgres:latest

RUN apt-get update && \
    apt-get install -y --no-install-recommends hunspell-pl && \
    rm -rf /var/lib/apt/lists/*

RUN cp /usr/share/hunspell/pl_PL.dic "$(pg_config --sharedir)/tsearch_data/polish.dict" && \
    cp /usr/share/hunspell/pl_PL.aff "$(pg_config --sharedir)/tsearch_data/polish.affix"
