# Ghi chú nghiên cứu: chuyển prompt từ Claude Code sang Codex

Ngày cập nhật: 27/10/2026

## Kết luận điều hành

Không có đủ bằng chứng từ tài liệu chính thức được xem xét để kết luận rằng Codex nói chung tuân thủ kém hơn Claude Code. Có những khác biệt thực tế về cách khai báo instruction, memory, subagent, quyền công cụ và hành vi dừng/tiếp tục theo model. Khi chuyển nguyên một prompt được tối ưu cho Claude Code sang Codex, các khác biệt này có thể tạo cảm giác Codex bỏ sót quy trình hoặc handoff kém hơn.

Tài liệu Codex hiện hành của OpenAI nêu thẳng rằng một số model GPT-6 Astra có xu hướng thận trọng khi quyết định dừng, có thể trở lại sau bản triển khai đầu tiên dù còn việc, và prompt cần xác định rõ tiêu chí hoàn thành. OpenAI đồng thời khuyên bỏ các preamble/kế hoạch/trạng thái trung gian không cần thiết trong quá trình thực thi; điều này không mâu thuẫn với checkpoint và báo cáo bắt buộc tại các cổng phê duyệt thực sự.

## Những nguyên nhân có cơ sở để kiểm tra

### 1. Prompt được viết cho hệ sinh thái khác

Prompt cũ có tham chiếu đến `CLAUDE.md`, Ponytail, Goal Mode và giới hạn 4.000 ký tự của handoff. Không nên mặc định Codex hiểu hoặc sử dụng đúng các cơ chế này. Codex ưu tiên instruction theo quy tắc discovery của chính nó, đặc biệt là `AGENTS.md`, cấu hình Codex và các instruction theo thư mục. Khi chuyển agent, cần đổi cả cách lưu quy tắc và cách khởi động/tiếp tục công việc, không chỉ đổi tên công cụ.

### 2. Instruction quá dài, quá cứng hoặc không được nạp như dự kiến

OpenAI ghi rõ `AGENTS.md` có giới hạn tổng nội dung mặc định (32 KiB ở cấu hình được mô tả) và khuyên tách instruction chuyên biệt sang các thư mục con. Một `AGENTS.override.md` có thể thay thế file `AGENTS.md` tương ứng; file ở thư mục hiện hành và cấu hình toàn cục cũng ảnh hưởng chuỗi instruction. Vì vậy phải xác nhận file nào thực sự được nạp, thay vì chỉ giả định prompt đã được thấy.

OpenAI cũng khuyến nghị “progressive disclosure”: root instruction ngắn, đóng vai trò bản đồ dẫn tới nội dung chi tiết khi cần; không buộc agent đọc toàn bộ kiến trúc, database và deployment docs cho mỗi thay đổi nhỏ. Đây là lý do bản nâng cấp không biến mọi lần sửa file thành quy trình đọc toàn bộ tài liệu.

### 3. Kỳ vọng subagent có thể không khớp với model/cấu hình

Tài liệu Codex nói subagent có sẵn trong các bản Codex hiện hành, nhưng việc chủ động tự delegate còn tùy model/mức intelligence và instruction; yêu cầu delegate trực tiếp là cách rõ ràng hơn ở những mức chưa tự delegate. Subagent cũng tăng token và có thể tạo xung đột nếu nhiều agent sửa cùng một file. Do đó prompt mới yêu cầu delegate rõ ràng khi có lợi, giới hạn phạm vi và yêu cầu bằng chứng, nhưng không ép dùng agent cho mọi việc.

### 4. Handoff không phải là một bản tóm tắt hội thoại

Handoff dễ hỏng khi dựa vào chat history hoặc một lời nhắc ngắn không có branch/commit, working tree, file thay đổi, bằng chứng test, quyết định, blocker và đúng một việc tiếp theo. Tóm tắt có thể bỏ mất chi tiết; trạng thái còn có thể sai nếu agent tin vào bản ghi cũ thay vì kiểm tra repo. Bản mới tách rõ:

- `progress.json`: trạng thái hiện tại và việc tiếp theo.
- `handoff.md`: thông tin tối thiểu để agent/phiên sau tiếp tục.
- `build-log.md`: lịch sử hành động và kết quả kiểm chứng thực tế.
- `lessons.jsonl`: kinh nghiệm có thể tìm lại và kiểm tra.
- Task/phase documents và ADRs: phạm vi được duyệt và quyết định thiết kế.

Mỗi nguồn có một quyền sở hữu rõ ràng để hạn chế mâu thuẫn và trùng lặp.

### 5. Prompt không phải cơ chế cưỡng chế

Lệnh bằng ngôn ngữ tự nhiên hữu ích nhưng không đảm bảo tuyệt đối. Với lỗi có thể phát hiện một cách xác định, nên chuyển nó thành regression test, lint, validator, CI gate hoặc hook nếu nền tảng đang dùng hỗ trợ. Những thay đổi ảnh hưởng approval/security/release vẫn cần cổng phê duyệt đúng nghĩa; không nên giả định prompt có thể vượt qua sandbox, quyền công cụ hoặc policy của host.

### 6. “Học hỏi” phải biến thành hành động phòng ngừa có thể kiểm chứng

Ghi càng nhiều nhật ký không đồng nghĩa với cải tiến. Một vòng lặp hữu ích cần:

1. Tìm bài học liên quan trước khi bắt đầu.
2. Ghi lại sự cố có tác động hoặc khả năng tái diễn, kèm bằng chứng.
3. Phân biệt root cause đã xác nhận với giả thuyết.
4. Chọn nơi sửa thích hợp: instruction, tài liệu, skill, validator, regression test hoặc không thay đổi.
5. Chạy kiểm tra chứng minh cơ chế phòng ngừa hoạt động khi có thể.
6. Đánh giá định kỳ sự tái diễn, công sức lãng phí và chất lượng handoff.

Không nên đưa từng lỗi vặt thành một luật mới. Bài học cần có trạng thái (`candidate`, `confirmed`, `promoted`, `retired`), phạm vi, trigger, bằng chứng, biện pháp phòng ngừa, cách xác thực và số lần gặp.

## Các nguồn chính thức đã đối chiếu

1. OpenAI, **Rethinking skills and prompts for GPT-6 Astra**, 11/09/2026: https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra
   - Về kích cỡ instruction/skill, progressive disclosure, nested documents, decision boundaries và yêu cầu hoàn thành đầu-cuối.
2. OpenAI, **Iterating Development Workflows with Codex**, 03/08/2026: https://developers.openai.com/cookbook/examples/codex/iterating-development-workflows-with-codex
   - Ví dụ về `AGENTS.md`, phase context, build log, handoff, retrospective, materiality threshold và chuyển lỗi quy trình thành regression/evaluable safeguards.
3. OpenAI, **Custom instructions with AGENTS.md**: https://learn.chatgpt.com/docs/agent-configuration/agents-md
   - Discovery instruction, cấu hình kích thước, file global/root/nested/override và cách kiểm tra instruction đang được nạp.
4. OpenAI, **Subagents**: https://learn.chatgpt.com/docs/agent-configuration/subagents
   - Tình trạng hỗ trợ subagent, cách kích hoạt, cân bằng song song với chi phí token và rủi ro xung đột khi sửa đồng thời.
5. OpenAI, **Harness engineering: leveraging Codex in an agent-first world**, 11/02/2026: https://openai.com/index/harness-engineering/
   - Repository làm nguồn tri thức chính, enforce invariants bằng linter/test, và biến phản hồi người dùng/bug/review thành quy tắc hoặc công cụ.
6. OpenAI, **Build an Agent Improvement Loop with Traces, Evals, and Codex**, 12/05/2026: https://developers.openai.com/cookbook/examples/agents_sdk/agent_improvement_loop
   - Feedback loop dùng traces, phản hồi, evals và regression suite để cải tiến harness dựa trên bằng chứng.
7. Anthropic, **Prompting best practices — Agentic systems**: https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/prompt-templates-and-variables
   - Mô tả các hướng dẫn của Claude về state tracking, workflow nhiều context windows, cấu trúc trạng thái, subagent và quản lý context. Đây là đối chiếu tài liệu của nhà cung cấp, không phải benchmark độc lập để kết luận mô hình nào tuân thủ tốt hơn.

## Chính sách context/handoff đã chốt theo nhu cầu vận hành

Người dùng muốn tránh việc bàn giao quá sớm khi task phức tạp chưa đạt trạng thái có thể tiếp tục an toàn. Chính sách đã sửa trong prompt: **272K–280K active-context tokens là vùng handoff mục tiêu khi runtime hỗ trợ; 320K là trần chính sách tuyệt đối.** Các mốc là quy ước vận hành dự án, không phải con số OpenAI bảo đảm hay mặc định cho mọi Codex runtime.

### Phân biệt metadata để tránh hiểu sai

Repository chính thức `openai/codex` có model catalog cập nhật trong tháng 10/2026, trong đó metadata cho một số model Codex liệt kê `context_window: 272000` và `max_context_window: 872000`. Điều này cho thấy không nên luôn coi 272K là một hard maximum áp dụng cho mọi cấu hình, nhưng cũng **không** có nghĩa phiên đang dùng mặc nhiên có effective capacity 872K. Runtime có thể áp dụng giới hạn/caps riêng; UI hoặc một phiên khác có thể báo số khác. Phải kiểm tra model/runtime hiện hành tại phiên thực tế. Nguồn: https://github.com/openai/codex/blob/main/codex-rs/models-manager/models.json

Cần phân biệt: (1) `context_window` mặc định, (2) `max_context_window`, (3) effective context capacity sau các giới hạn runtime, (4) active-context usage hiện tại, và (5) tổng token usage tích lũy của toàn hội thoại/tài khoản. Chính sách 272K–320K áp dụng cho **active context counter được runtime báo**, không áp dụng cho tổng token tích lũy qua nhiều lượt đã compaction. Nếu runtime hiện chỉ hỗ trợ active capacity khoảng 272K hoặc thấp hơn sau cap, phải handoff trước giới hạn thật; không thể yêu cầu model giữ thêm context bằng câu lệnh.

### Các mốc thực thi trong prompt

- **60% của effective capacity:** checkpoint những quyết định, milestone, lỗi/khắc phục và trạng thái repository có ý nghĩa.
- **70%:** bắt đầu lưu hồ sơ handoff và tránh nạp thêm bối cảnh không liên quan; không tự động cắt ngang một task phức tạp chỉ vì đạt phần trăm này.
- **80%:** bước vào chế độ chuẩn bị bàn giao; không mở thêm gói công việc lớn, hoàn tất hoặc tạm dừng an toàn ở một ranh giới có thể phục hồi.
- **240K:** nếu runtime cho phép ít nhất 320K active context, xác minh trạng thái và hồ sơ handoff đã cập nhật.
- **256K:** không mở gói triển khai lớn mới; chỉ đi tiếp một bước bounded khi cần để đạt trạng thái an toàn và vẫn trong giới hạn runtime đã xác minh.
- **272K–280K:** vùng handoff mục tiêu. Chọn ranh giới an toàn sớm nhất; không bỏ dở giữa một thao tác phá hủy, migration hoặc ghi dữ liệu chưa thể phục hồi.
- **300K:** cảnh báo bắt buộc; không còn triển khai mới hoặc khảo sát diện rộng, bàn giao ngay sau bước nguyên tử an toàn nhỏ nhất.
- **320K:** trần tuyệt đối của policy; tuyệt đối không cố vượt, kể cả khi model metadata liệt kê mức tối đa cao hơn. Trần runtime thực tế nếu thấp hơn luôn được ưu tiên.

Các mốc 60/70/80% là cảnh báo tương đối; các mốc 240K–320K là ngưỡng tuyệt đối. Hành động chuẩn bị nào đến sớm hơn sẽ được ưu tiên. Nếu runtime không đưa ra bộ đếm usage đáng tin cậy, agent không được đoán số token; phải checkpoint theo milestone, quy mô tool output, số lần debug và rủi ro mất context, đồng thời ghi rõ rằng chưa thể đo ngưỡng chính xác. Không sửa Codex config cấp người dùng trong Phase 0; trước tiên đọc cấu hình và báo liệu cấu hình hỗ trợ target 272–280K/ceiling 320K hay không. Nếu cần thay đổi, giải thích setting được hỗ trợ và xin quyền phù hợp.

Tự động compaction không phải lý do bỏ checkpoint. Trước khi dự đoán compaction, ghi state bền vững; sau compaction hoặc khi resume, đọc lại `progress.json`/`handoff.md` và xác minh chúng với repository thật. Sau vài phiên pilot, đánh giá xem chính sách có bàn giao quá sớm, quá muộn hay làm gián đoạn công việc không. Đây là policy nội bộ của dự án, không phải ngưỡng chính thức OpenAI khuyến nghị.

## Frontend: định nghĩa chất lượng có thể kiểm chứng

Một lo ngại người dùng nêu rõ là UI do Codex tạo có thể chạy được nhưng bố cục thiếu chặt chẽ, dễ vỡ và responsive kém. Vì thế prompt đã tăng yêu cầu frontend từ lời khuyên thẩm mỹ thành acceptance gate.

### Quy trình bắt buộc với thay đổi UI có ý nghĩa

1. Trước khi làm, xác định workflow thật của gia sư/học viên, page hierarchy, layout blueprint, design tokens, component contracts, trạng thái màn hình và responsive behavior. Lưu hướng dẫn đủ gọn trong `docs/frontend/`.
2. Khi có browser/Playwright/visual tooling phù hợp, chạy ứng dụng và kiểm tra UI đã render thực tế; không suy luận chỉ từ JSX, CSS, TypeScript hoặc screenshot desktop duy nhất.
3. Test tối thiểu các viewport 320, 360, 390, 430, 768, 1024, 1280 và 1440 CSS px nếu tooling hỗ trợ. Bao gồm các page templates và critical journeys, không nhất thiết chạy toàn bộ suite trên mọi viewport cho mọi thay đổi nhỏ.
4. Kiểm tra body-level horizontal overflow, control bị chồng/cắt, wrap chữ, menu/sidebar mobile, focus/keyboard, bảng dữ liệu, modal/drawer trên màn hình thấp, sticky elements che nội dung, trạng thái loading/empty/error/validation, browser console và runtime errors.
5. Dùng dữ liệu thực tế đa dạng: tên dài, danh sách lớn, nội dung dài, chưa có dữ liệu, lỗi request và validation. Không được che giấu thông tin hoặc thao tác quan trọng chỉ để vừa viewport.
6. Với table, dùng phương pháp responsive có chủ đích: ưu tiên cột, hiển thị thông tin chi tiết dạng stacked, hoặc horizontal scroller chỉ bên trong vùng bảng. Không để cả trang bị tràn ngang. Layout mobile phải là thiết kế có chủ đích chứ không phải desktop bị ép nhỏ.
7. Ghi bằng chứng ngắn: route, viewport thật sự đã thử, workflow đã thao tác, lỗi phát hiện/đã sửa và lệnh/tool dùng. Nếu không có browser tooling, chạy các kiểm tra khả dụng và tuyên bố rõ visual QA còn chưa thực hiện; không báo “responsive verified”.

OpenAI mô tả harness engineering như một hệ thống làm cho trạng thái ứng dụng, screenshot, logs và workflow có thể đọc/kiểm tra được với agent; họ cũng nêu cần chuyển các nguyên tắc chất lượng thành linter/test khi có thể. Nguồn: https://openai.com/index/harness-engineering/ Đây là cơ sở cho hướng tiếp cận kiểm tra giao diện có bằng chứng, không phải bằng chứng rằng Codex tự động làm tốt responsive nếu không có tooling và acceptance criteria.


## Tài liệu bổ sung về context và UI

8. OpenAI Codex repository, **model catalog**: https://github.com/openai/codex/blob/main/codex-rs/models-manager/models.json — kiểm tra trường context cho các model Codex cụ thể. Đây là metadata thay đổi theo thời gian; hãy kiểm tra phiên bản hiện hành thay vì hard-code làm chân lý vĩnh viễn.
9. OpenAI, **Harness engineering: leveraging Codex in an agent-first world**: https://openai.com/index/harness-engineering/ — repository knowledge, agent legibility, observable UI, screenshot/browser workflow, và chuyển nguyên tắc thành kiểm tra xác định.

## Khuyến nghị áp dụng

- Dùng file `Codex_Project_Initialization_and_Agent_Governance.md` như **prompt khởi tạo một lần**, không chép nguyên xi hơn 40 KiB vào `AGENTS.md` toàn cục hay root. Đặt bản nghiên cứu này tại `docs/agent-governance/research/Codex_Harness_Research_Notes_VI.md` để Codex có thể tra cứu trong Phase 0/Phase 1, nhưng luôn coi nó là tài liệu tham khảo cho harness chứ không phải đặc tả sản phẩm.
- Chỉ chạy Phase 0 trước. Sau khi xem báo cáo và gửi `START PHASE 1`, mới cho Codex tạo tài liệu/harness. Sau Phase 1, phê duyệt riêng trước khi triển khai product code.
- Khi dựng harness, giữ `AGENTS.md` ngắn, dùng đường dẫn rõ tới tài liệu chi tiết, và xác minh Codex thật sự nạp instruction đúng. Kiểm tra root, nested, override và file global nếu hành vi khác dự kiến.
- Dùng một task nhỏ làm pilot trước khi áp dụng cho toàn bộ backlog: theo dõi số lần đọc lại không cần thiết, lỗi lặp lại, test được chạy đúng mức rủi ro, handoff có đủ evidence và số lần user phải sửa agent.
- Không gọi quy trình mới là hiệu quả chỉ vì nó nhiều file hơn. Giữ lại những cơ chế nào giảm tái diễn hoặc tăng độ tin cậy có thể quan sát; bỏ cơ chế không mang lại lợi ích đủ lớn.
