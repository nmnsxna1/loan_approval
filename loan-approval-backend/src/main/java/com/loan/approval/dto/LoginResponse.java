package com.loan.approval.dto;

import com.loan.approval.entity.Role;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginResponse {

    private String token;
    private String username;
    private String email;
    private Role role;
}
