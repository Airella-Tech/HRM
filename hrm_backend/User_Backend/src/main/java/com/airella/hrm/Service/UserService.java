package com.airella.hrm.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.modelmapper.ModelMapper;
import org.modelmapper.TypeToken;
import com.airella.hrm.Model.User;
import com.airella.hrm.Repo.UserRepo;
import com.airella.hrm.DTO.UserDTO;
import com.airella.hrm.DTO.LoginDTO;
import java.util.List;
import java.util.Optional;
import java.util.Objects;


@Service
@Transactional
public class UserService {
    @Autowired
    private UserRepo userRepo;

    @Autowired
    private ModelMapper modelMapper;

    public List<UserDTO> getAllUsers(){
        List<User>userList = userRepo.findAll();
        return modelMapper.map(userList, new TypeToken<List<UserDTO>>(){}.getType());
    }

    public UserDTO getUserById(int userId){
        User user = Objects.requireNonNull(userRepo.getUserById(userId), "User not found");
        return modelMapper.map(user, UserDTO.class);
    }

    public UserDTO saveUser(UserDTO userDTO){
        userRepo.save(Objects.requireNonNull(modelMapper.map(userDTO, User.class), "User map result is null"));
        return userDTO;
    }

    public UserDTO updateUser(UserDTO userDTO){
        userRepo.save(Objects.requireNonNull(modelMapper.map(userDTO, User.class), "User map result is null"));
        return userDTO;
    }

    public String deleteUser1(Integer userId){
        userRepo.deleteById(userId);
        return "User deleted1";
    }

    public String deleteUser2(UserDTO userDTO){
        userRepo.delete(Objects.requireNonNull(modelMapper.map(userDTO, User.class), "User map result is null"));
        return "User deleted2";
    }

    public UserDTO loginUser(LoginDTO loginDTO) {
        // Find the user by email
        Optional<User> userOptional = userRepo.findByEmail(loginDTO.getEmail());

        if (userOptional.isPresent()) {
            User user = userOptional.get();

            // Check if the password matches
            if (user.getPassword().equals(loginDTO.getPassword())) {
                // Passwords match, return the user's data
                return modelMapper.map(user, UserDTO.class);
            } else {
                // Invalid password
                throw new RuntimeException("Invalid email or password");
            }
        } else {
            // No user found with that email
            throw new RuntimeException("Invalid email or password");
        }
    }
}
