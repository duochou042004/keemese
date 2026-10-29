# C1c bounded local query plans — 2026-10-29

Captured from the real passing targeted ContentSearchTests run on the pinned disposable PostgreSQL image. Synthetic values only. Each parameterized EXPLAIN (ANALYZE, BUFFERS) selects summary fields, filters active rows, orders updatedAt descending/ID ascending and takes26 at the indicated offset. The adjacent elapsed measurement is the actual EF service list call (26 includes lookahead), not an HTTP or production latency. EXPLAIN renders bound values in plans; application SQL parameterization is separately asserted.

The fixture has1000 rows (250 archived), two folder assignments,990 bodies of2000 UTF-16 units and10 of50000. Measurements are a single warm local sample per shape, not a capacity benchmark; all six passed the connection-local5s statement timeout. Scans in these plans confirm the storage/filter-index tradeoff; no substring index/extension was added. See [C1c evidence](c1c-text-search.md).

```text
PostgreSQL 18.6; .NET 10.0.14; OS Kali GNU/Linux Rolling; 1000 rows (990x2000-unit +10x50000-unit bodies), mixed folders/archive; statement_timeout5s.
 query=;page=1;actual_rows=26;API_query_elapsed_ms=5.45
 Limit  (cost=62.38..62.44 rows=26 width=50) (actual time=0.267..0.271 rows=26.00 loops=1)
   Buffers: shared hit=31
   ->  Sort  (cost=62.38..64.25 rows=750 width=50) (actual time=0.267..0.268 rows=26.00 loops=1)
         Sort Key: "UpdatedAt" DESC, "Id"
         Sort Method: top-N heapsort  Memory: 28kB
         Buffers: shared hit=31
         ->  Seq Scan on "TextContents"  (cost=0.00..41.00 rows=750 width=50) (actual time=0.005..0.140 rows=750.00 loops=1)
               Filter: (NOT "Archived")
               Rows Removed by Filter: 250
               Buffers: shared hit=31
 Planning Time: 0.079 ms
 Execution Time: 0.296 ms

 query=cost title 999;page=1;actual_rows=1;API_query_elapsed_ms=2.47
 Limit  (cost=71.05..71.11 rows=26 width=50) (actual time=1.501..1.502 rows=1.00 loops=1)
   Buffers: shared hit=31
   ->  Sort  (cost=71.05..72.37 rows=528 width=50) (actual time=1.501..1.501 rows=1.00 loops=1)
         Sort Key: "UpdatedAt" DESC, "Id"
         Sort Method: quicksort  Memory: 25kB
         Buffers: shared hit=31
         ->  Seq Scan on "TextContents"  (cost=0.00..56.00 rows=528 width=50) (actual time=0.221..1.488 rows=1.00 loops=1)
               Filter: ((NOT "Archived") AND ((strpos("SearchTitle", 'COST TITLE 999'::text) > 0) OR (strpos("SearchDescription", 'COST TITLE 999'::text) > 0) OR (strpos("SearchBody", 'COST TITLE 999'::text) > 0)))
               Rows Removed by Filter: 999
               Buffers: shared hit=31
 Planning Time: 0.056 ms
 Execution Time: 1.519 ms

 query=bodyonly;page=1;actual_rows=1;API_query_elapsed_ms=2.54
 Limit  (cost=71.05..71.11 rows=26 width=50) (actual time=1.916..1.916 rows=1.00 loops=1)
   Buffers: shared hit=31
   ->  Sort  (cost=71.05..72.37 rows=528 width=50) (actual time=1.915..1.916 rows=1.00 loops=1)
         Sort Key: "UpdatedAt" DESC, "Id"
         Sort Method: quicksort  Memory: 25kB
         Buffers: shared hit=31
         ->  Seq Scan on "TextContents"  (cost=0.00..56.00 rows=528 width=50) (actual time=1.701..1.902 rows=1.00 loops=1)
               Filter: ((NOT "Archived") AND ((strpos("SearchTitle", 'BODYONLY'::text) > 0) OR (strpos("SearchDescription", 'BODYONLY'::text) > 0) OR (strpos("SearchBody", 'BODYONLY'::text) > 0)))
               Rows Removed by Filter: 999
               Buffers: shared hit=31
 Planning Time: 0.071 ms
 Execution Time: 1.933 ms

 query=absent-needle;page=1;actual_rows=0;API_query_elapsed_ms=2.24
 Limit  (cost=71.05..71.11 rows=26 width=50) (actual time=1.574..1.575 rows=0.00 loops=1)
   Buffers: shared hit=31
   ->  Sort  (cost=71.05..72.37 rows=528 width=50) (actual time=1.574..1.574 rows=0.00 loops=1)
         Sort Key: "UpdatedAt" DESC, "Id"
         Sort Method: quicksort  Memory: 25kB
         Buffers: shared hit=31
         ->  Seq Scan on "TextContents"  (cost=0.00..56.00 rows=528 width=50) (actual time=1.562..1.562 rows=0.00 loops=1)
               Filter: ((NOT "Archived") AND ((strpos("SearchTitle", 'ABSENT-NEEDLE'::text) > 0) OR (strpos("SearchDescription", 'ABSENT-NEEDLE'::text) > 0) OR (strpos("SearchBody", 'ABSENT-NEEDLE'::text) > 0)))
               Rows Removed by Filter: 1000
               Buffers: shared hit=31
 Planning Time: 0.063 ms
 Execution Time: 1.591 ms

 query=a;page=1;actual_rows=26;API_query_elapsed_ms=1.79
 Limit  (cost=71.05..71.11 rows=26 width=50) (actual time=1.113..1.116 rows=26.00 loops=1)
   Buffers: shared hit=31
   ->  Sort  (cost=71.05..72.37 rows=528 width=50) (actual time=1.112..1.113 rows=26.00 loops=1)
         Sort Key: "UpdatedAt" DESC, "Id"
         Sort Method: top-N heapsort  Memory: 28kB
         Buffers: shared hit=31
         ->  Seq Scan on "TextContents"  (cost=0.00..56.00 rows=528 width=50) (actual time=0.008..0.972 rows=750.00 loops=1)
               Filter: ((NOT "Archived") AND ((strpos("SearchTitle", 'A'::text) > 0) OR (strpos("SearchDescription", 'A'::text) > 0) OR (strpos("SearchBody", 'A'::text) > 0)))
               Rows Removed by Filter: 250
               Buffers: shared hit=31
 Planning Time: 0.067 ms
 Execution Time: 1.134 ms

 query=;page=40;actual_rows=0;API_query_elapsed_ms=1.08
 Limit  (cost=78.69..78.69 rows=1 width=50) (actual time=0.628..0.629 rows=0.00 loops=1)
   Buffers: shared hit=31
   ->  Sort  (cost=76.82..78.69 rows=750 width=50) (actual time=0.572..0.601 rows=750.00 loops=1)
         Sort Key: "UpdatedAt" DESC, "Id"
         Sort Method: quicksort  Memory: 124kB
         Buffers: shared hit=31
         ->  Seq Scan on "TextContents"  (cost=0.00..41.00 rows=750 width=50) (actual time=0.007..0.167 rows=750.00 loops=1)
               Filter: (NOT "Archived")
               Rows Removed by Filter: 250
               Buffers: shared hit=31
 Planning Time: 0.061 ms
 Execution Time: 0.666 ms
```
