# C1d bounded local tag query plans — 2026-10-29

Final-code synthetic fixture:1000 texts,1000 catalog tags,20 links/text (20000 total), mixed archive/folder state. Exact pinned PostgreSQL18.6, Npgsql/EF10 and .NET runtime on rootless local Podman. Actual service calls use repeatable snapshots and assert1 command for empty rows or2 for a nonempty page (one label batch),20 tags/row and a64KiB bound on this fixture’s serialized summaries. This is a fixture bound, not a universal response-size limit.

Four parameterized EXPLAIN (ANALYZE, BUFFERS) shapes select summary fields and use tag EXISTS/untagged NOT EXISTS before order/limit/offset, with folder/q in the combined case. All pass a connection-only5s timeout. Elapsed service times include first-use EF/connection/transaction work; SQL plans are subsequent samples. These are single local observations, not production/HTTP latency or capacity promises. EXPLAIN renders synthetic bound UUIDs/values; no connection secrets are retained. [Acceptance evidence](c1d-text-tags.md) owns other results.

```text
PostgreSQL18.6;.NET10.0.14;1000 texts,20000 links,1000 terms;5s connection-only timeout;Kali GNU/Linux Rolling
 shape=tag;page=1;rows=15;commands=2;payload_bytes=22348;service_ms=158.49
 Limit  (cost=89.79..89.83 rows=15 width=32) (actual time=0.277..0.281 rows=15.00 loops=1)
   Buffers: shared hit=36
   ->  Sort  (cost=89.79..89.83 rows=15 width=32) (actual time=0.276..0.279 rows=15.00 loops=1)
         Sort Key: t."UpdatedAt" DESC, t."Id"
         Sort Method: quicksort  Memory: 26kB
         Buffers: shared hit=36
         ->  Hash Join  (cost=60.52..89.50 rows=15 width=32) (actual time=0.105..0.259 rows=15.00 loops=1)
               Hash Cond: (t."Id" = j."TextContentId")
               Buffers: shared hit=36
               ->  Seq Scan on "TextContents" t  (cost=0.00..27.00 rows=750 width=32) (actual time=0.019..0.129 rows=750.00 loops=1)
                     Filter: (NOT "Archived")
                     Rows Removed by Filter: 250
                     Buffers: shared hit=17
               ->  Hash  (cost=60.27..60.27 rows=20 width=16) (actual time=0.071..0.071 rows=20.00 loops=1)
                     Buckets: 1024  Batches: 1  Memory Usage: 9kB
                     Buffers: shared hit=19
                     ->  Bitmap Heap Scan on "TextContentTags" j  (cost=4.44..60.27 rows=20 width=16) (actual time=0.036..0.053 rows=20.00 loops=1)
                           Recheck Cond: ("TagId" = '18a78419-c0b7-4bba-a9de-1c310dcf5d80'::uuid)
                           Heap Blocks: exact=17
                           Buffers: shared hit=19
                           ->  Bitmap Index Scan on "IX_TextContentTags_TagId_TextContentId"  (cost=0.00..4.44 rows=20 width=0) (actual time=0.029..0.029 rows=20.00 loops=1)
                                 Index Cond: ("TagId" = '18a78419-c0b7-4bba-a9de-1c310dcf5d80'::uuid)
                                 Index Searches: 1
                                 Buffers: shared hit=2
 Planning:
   Buffers: shared hit=12
 Planning Time: 0.440 ms
 Execution Time: 0.363 ms

 shape=untagged;page=1;rows=0;commands=1;payload_bytes=2;service_ms=13.12
 Limit  (cost=400.02..400.02 rows=1 width=32) (actual time=1.635..1.635 rows=0.00 loops=1)
   Buffers: shared hit=2267
   ->  Sort  (cost=400.02..400.02 rows=1 width=32) (actual time=1.634..1.634 rows=0.00 loops=1)
         Sort Key: t."UpdatedAt" DESC, t."Id"
         Sort Method: quicksort  Memory: 25kB
         Buffers: shared hit=2267
         ->  Nested Loop Anti Join  (cost=0.29..400.01 rows=1 width=32) (actual time=1.624..1.624 rows=0.00 loops=1)
               Buffers: shared hit=2267
               ->  Seq Scan on "TextContents" t  (cost=0.00..27.00 rows=750 width=32) (actual time=0.006..0.132 rows=750.00 loops=1)
                     Filter: (NOT "Archived")
                     Rows Removed by Filter: 250
                     Buffers: shared hit=17
               ->  Index Only Scan using "PK_TextContentTags" on "TextContentTags" j  (cost=0.29..2.29 rows=20 width=16) (actual time=0.002..0.002 rows=1.00 loops=750)
                     Index Cond: ("TextContentId" = t."Id")
                     Heap Fetches: 750
                     Index Searches: 750
                     Buffers: shared hit=2250
 Planning:
   Buffers: shared hit=12
 Planning Time: 0.235 ms
 Execution Time: 1.665 ms

 shape=combined;page=1;rows=5;commands=2;payload_bytes=7563;service_ms=22.66
 Limit  (cost=95.36..95.36 rows=2 width=32) (actual time=0.204..0.206 rows=5.00 loops=1)
   Buffers: shared hit=36
   ->  Sort  (cost=95.36..95.36 rows=2 width=32) (actual time=0.203..0.205 rows=5.00 loops=1)
         Sort Key: t."UpdatedAt" DESC, t."Id"
         Sort Method: quicksort  Memory: 25kB
         Buffers: shared hit=36
         ->  Hash Join  (cost=60.52..95.35 rows=2 width=32) (actual time=0.118..0.194 rows=5.00 loops=1)
               Hash Cond: (t."Id" = j."TextContentId")
               Buffers: shared hit=36
               ->  Seq Scan on "TextContents" t  (cost=0.00..34.50 rows=125 width=32) (actual time=0.056..0.118 rows=250.00 loops=1)
                     Filter: ((NOT "Archived") AND ("FolderId" = '734dd246-b1e0-4956-b7c1-cf42890bd28b'::uuid) AND (strpos("SearchTitle", 'COST'::text) > 0))
                     Rows Removed by Filter: 750
                     Buffers: shared hit=17
               ->  Hash  (cost=60.27..60.27 rows=20 width=16) (actual time=0.043..0.043 rows=20.00 loops=1)
                     Buckets: 1024  Batches: 1  Memory Usage: 9kB
                     Buffers: shared hit=19
                     ->  Bitmap Heap Scan on "TextContentTags" j  (cost=4.44..60.27 rows=20 width=16) (actual time=0.020..0.031 rows=20.00 loops=1)
                           Recheck Cond: ("TagId" = '18a78419-c0b7-4bba-a9de-1c310dcf5d80'::uuid)
                           Heap Blocks: exact=17
                           Buffers: shared hit=19
                           ->  Bitmap Index Scan on "IX_TextContentTags_TagId_TextContentId"  (cost=0.00..4.44 rows=20 width=0) (actual time=0.015..0.015 rows=20.00 loops=1)
                                 Index Cond: ("TagId" = '18a78419-c0b7-4bba-a9de-1c310dcf5d80'::uuid)
                                 Index Searches: 1
                                 Buffers: shared hit=2
 Planning:
   Buffers: shared hit=12
 Planning Time: 0.292 ms
 Execution Time: 0.269 ms

 shape=tag;page=40;rows=0;commands=1;payload_bytes=2;service_ms=2.22
 Limit  (cost=89.83..89.83 rows=1 width=32) (actual time=0.222..0.223 rows=0.00 loops=1)
   Buffers: shared hit=36
   ->  Sort  (cost=89.79..89.83 rows=15 width=32) (actual time=0.221..0.222 rows=15.00 loops=1)
         Sort Key: t."UpdatedAt" DESC, t."Id"
         Sort Method: quicksort  Memory: 26kB
         Buffers: shared hit=36
         ->  Hash Join  (cost=60.52..89.50 rows=15 width=32) (actual time=0.061..0.209 rows=15.00 loops=1)
               Hash Cond: (t."Id" = j."TextContentId")
               Buffers: shared hit=36
               ->  Seq Scan on "TextContents" t  (cost=0.00..27.00 rows=750 width=32) (actual time=0.011..0.115 rows=750.00 loops=1)
                     Filter: (NOT "Archived")
                     Rows Removed by Filter: 250
                     Buffers: shared hit=17
               ->  Hash  (cost=60.27..60.27 rows=20 width=16) (actual time=0.041..0.041 rows=20.00 loops=1)
                     Buckets: 1024  Batches: 1  Memory Usage: 9kB
                     Buffers: shared hit=19
                     ->  Bitmap Heap Scan on "TextContentTags" j  (cost=4.44..60.27 rows=20 width=16) (actual time=0.021..0.031 rows=20.00 loops=1)
                           Recheck Cond: ("TagId" = '18a78419-c0b7-4bba-a9de-1c310dcf5d80'::uuid)
                           Heap Blocks: exact=17
                           Buffers: shared hit=19
                           ->  Bitmap Index Scan on "IX_TextContentTags_TagId_TextContentId"  (cost=0.00..4.44 rows=20 width=0) (actual time=0.015..0.015 rows=20.00 loops=1)
                                 Index Cond: ("TagId" = '18a78419-c0b7-4bba-a9de-1c310dcf5d80'::uuid)
                                 Index Searches: 1
                                 Buffers: shared hit=2
 Planning:
   Buffers: shared hit=12
 Planning Time: 0.248 ms
 Execution Time: 0.297 ms
```
