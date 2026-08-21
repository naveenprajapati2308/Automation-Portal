package com.automationportal.apitesting.formdata;

import com.automationportal.apitesting.security.CurrentProjectService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Backs the Text/File toggle on form-data body rows (API Tester, Base API,
 * Regular API all share this). A file is uploaded here the moment the user
 * picks it — not deferred to Send/Save — so its bytes are durably stored
 * before any execution (manual or scheduled) needs them.
 */
@RestController
@RequestMapping("/api/v1/form-data-files")
@RequiredArgsConstructor
public class FormDataFileController {

    private static final long MAX_SIZE_BYTES = 25L * 1024 * 1024;

    private final FormDataFileStore store;
    private final FormDataFileRepository repository;
    private final CurrentProjectService currentProjectService;

    @Data
    public static class FormDataFileDto {
        private String fileId;
        private String fileName;
        private String contentType;
        private long size;

        static FormDataFileDto of(FormDataFile f) {
            FormDataFileDto dto = new FormDataFileDto();
            dto.fileId = f.getId();
            dto.fileName = f.getOriginalFilename();
            dto.contentType = f.getContentType();
            dto.size = f.getSizeBytes();
            return dto;
        }
    }

    @PostMapping
    public FormDataFileDto upload(@RequestParam("file") MultipartFile file) throws java.io.IOException {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File exceeds the 25MB limit");
        }

        String fileId = store.store(file.getBytes());

        FormDataFile record = new FormDataFile();
        record.setId(fileId);
        record.setProjectId(currentProjectService.requireProjectId());
        record.setOriginalFilename(file.getOriginalFilename());
        record.setContentType(file.getContentType());
        record.setSizeBytes(file.getSize());
        repository.save(record);

        return FormDataFileDto.of(record);
    }

    @DeleteMapping("/{fileId}")
    public void delete(@PathVariable String fileId) {
        FormDataFile record = find(fileId);
        store.delete(record.getId());
        repository.delete(record);
    }

    private FormDataFile find(String fileId) {
        FormDataFile record = repository.findById(fileId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found"));
        if (!currentProjectService.requireProjectId().equals(record.getProjectId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found");
        }
        return record;
    }
}
